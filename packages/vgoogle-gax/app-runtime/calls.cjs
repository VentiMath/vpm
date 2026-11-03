"use strict";
const { Readable, Duplex } = require("node:stream");
const { CallSettings, GoogleError, Status } = require("./settings.cjs"),
  tracing = require("./tracing.cjs");
const fail = (code, message) =>
  Object.assign(new GoogleError(message), { code });
const StreamType = {
  SERVER_STREAMING: 1,
  CLIENT_STREAMING: 2,
  BIDI_STREAMING: 3,
  1: "SERVER_STREAMING",
  2: "CLIENT_STREAMING",
  3: "BIDI_STREAMING",
};
class StreamDescriptor {
  constructor(type, rest = false, gaxStreamingRetries = false) {
    if (![1, 2, 3].includes(type))
      throw new TypeError("Invalid streaming type");
    Object.assign(this, { type, rest, gaxStreamingRetries, streaming: true });
  }
}
class PageDescriptor {
  constructor(requestPageTokenField, responsePageTokenField, resourceField) {
    Object.assign(this, {
      requestPageTokenField,
      responsePageTokenField,
      resourceField,
    });
  }
  asyncIterate(apiCall, request, options = {}) {
    let pending;
    return {
      cancel() {
        pending?.cancel?.();
      },
      [Symbol.asyncIterator]: async function* () {
        let next = { ...request };
        try {
          while (next) {
            pending = apiCall(next, { ...options, autoPaginate: false });
            const [items, following] = await pending;
            pending = null;
            yield* Array.isArray(items) ? items : Object.entries(items ?? {});
            next = following;
          }
        } finally {
          pending?.cancel?.();
        }
      },
    };
  }
  createStream(apiCall, request, options = {}) {
    const iterable = this.asyncIterate(apiCall, request, options),
      iterator = iterable[Symbol.asyncIterator]();
    let reading = false;
    const stream = new Readable({
      objectMode: true,
      read() {
        if (reading) return;
        reading = true;
        iterator.next().then(
          ({ done, value }) => {
            reading = false;
            if (!stream.destroyed) stream.push(done ? null : value);
          },
          (error) => stream.destroy(error),
        );
      },
      destroy(error, callback) {
        iterable.cancel();
        void iterator.return?.().catch(() => {});
        callback(error);
      },
    });
    stream.cancel = () => stream.destroy();
    return stream;
  }
}
function metadata(settings) {
  const args = settings.otherArgs;
  return args.metadataBuilder
    ? args.metadataBuilder(undefined, args.headers ?? {})
    : null;
}
function transportOptions(settings, timeout) {
  const options = { ...settings.otherArgs.options };
  const requested = Date.now() + Math.max(0, timeout);
  const existing =
    options.deadline == null ? Infinity : Number(options.deadline);
  options.deadline = new Date(Math.min(existing, requested));
  return options;
}
function retryDelay(retry, number) {
  const b = retry?.backoffSettings ?? {};
  return (
    Math.max(
      0,
      Math.min(
        b.maxRetryDelayMillis ?? 60000,
        (b.initialRetryDelayMillis ?? 100) *
          (b.retryDelayMultiplier ?? 1.3) ** number,
      ),
    ) * Math.random()
  );
}
function unary(rpc, request, settings) {
  let current,
    timer,
    delayTimer,
    done = false,
    retries = 0,
    resolve,
    reject;
  const retry = settings.retry,
    b = retry?.backoffSettings ?? {},
    start = Date.now(),
    budget =
      b.totalTimeoutMillis ??
      (b.maxRetries !== undefined ? Infinity : settings.timeout),
    limit = b.maxRetries ?? Infinity;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const finish = (error, value) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    clearTimeout(delayTimer);
    error ? reject(error) : resolve(value);
  };
  promise.cancel = () => {
    if (done) return;
    finish(fail(Status.CANCELLED, "Call cancelled"));
    current?.cancel?.();
  };
  function attempt() {
    if (done) return;
    const remaining = budget - (Date.now() - start);
    if (remaining <= 0) {
      finish(fail(Status.DEADLINE_EXCEEDED, "Total call deadline exceeded"));
      return;
    }
    const timeout = Math.min(
      remaining,
      Math.min(
        b.maxRpcTimeoutMillis ?? Infinity,
        (b.initialRpcTimeoutMillis ?? settings.timeout) *
          (b.rpcTimeoutMultiplier ?? 1) ** retries,
      ),
    );
    let completed = false;
    const receive = (error, value) => {
      if (error && !(error instanceof Error))
        error = new GoogleError(String(error));
      if (done || completed) return;
      completed = true;
      clearTimeout(timer);
      if (error && retries < limit && retry?.retryCodes?.includes(error.code)) {
        const delay = retryDelay(retry, retries++);
        if (delay < budget - (Date.now() - start)) {
          delayTimer = setTimeout(attempt, delay);
          return;
        }
      }
      finish(error ? GoogleError.parseGRPCStatusDetails(error) : null, value);
    };
    if (Number.isFinite(timeout))
      timer = setTimeout(
        () => {
          receive(fail(Status.DEADLINE_EXCEEDED, "RPC deadline exceeded"));
          current?.cancel?.();
        },
        Math.min(2147483647, Math.max(0, timeout)),
      );
    try {
      const invoke = (cb) =>
        rpc(
          request,
          metadata(settings),
          transportOptions(settings, timeout),
          cb ?? receive,
        );
      current = settings._trace
        ? tracing.traceAttempt(
            { ...settings._trace.dynamic, resendCount: retries },
            settings._trace.statics,
            invoke,
            false,
            receive,
          )
        : invoke();
      if (current?.then) current.catch(receive);
    } catch (error) {
      receive(error);
    }
  }
  queueMicrotask(attempt);
  return promise;
}
function streaming(funcPromise, request, settings, descriptor) {
  let inner,
    writePending,
    finishPending,
    backoff,
    deadline,
    stopped = false,
    attempt = 0,
    delivered = 0,
    ended = false,
    statusSeen = false;
  let argument = request;
  const start = Date.now(),
    retry = settings.retry,
    b = retry?.backoffSettings ?? {},
    budget = b.totalTimeoutMillis ?? settings.timeout;
  const duplex = new Duplex({
    objectMode: true,
    read() {
      inner?.resume?.();
    },
    write(value, encoding, callback) {
      if (inner) inner.write(value, encoding, callback);
      else writePending = [value, encoding, callback];
    },
    final(callback) {
      if (descriptor.type === 1 || inner?.writableFinished) callback();
      else if (inner) inner.end(callback);
      else finishPending = callback;
    },
    destroy(error, callback) {
      stopped = true;
      clearTimeout(backoff);
      clearTimeout(deadline);
      inner?.cancel?.();
      writePending?.[2](error ?? fail(Status.CANCELLED, "Stream cancelled"));
      writePending = null;
      finishPending?.();
      finishPending = null;
      callback(error);
    },
  });
  duplex.cancel = () =>
    duplex.destroy(fail(Status.CANCELLED, "Stream cancelled"));
  const complete = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(backoff);
    clearTimeout(deadline);
    duplex.push(null);
    if (descriptor.type === 1) duplex.end();
  };
  async function connect() {
    if (stopped) return;
    try {
      const rpc = await funcPromise;
      if (stopped) return;
      const remaining = budget - (Date.now() - start);
      if (remaining <= 0)
        throw fail(Status.DEADLINE_EXCEEDED, "Streaming deadline exceeded");
      const timeout = Math.min(
          remaining,
          b.initialRpcTimeoutMillis ?? settings.timeout,
        ),
        opts = transportOptions(settings, timeout);
      let failed = false;
      ended = false;
      statusSeen = false;
      const onError = (error) => {
        if (stopped || failed) return;
        failed = true;
        clearTimeout(deadline);
        let eligible;
        try {
          eligible =
            descriptor.type === 1 &&
            (retry?.shouldRetryFn
              ? retry.shouldRetryFn(error)
              : retry?.retryCodes?.includes(error.code));
        } catch (cause) {
          duplex.destroy(cause);
          return;
        }
        const safe =
          delivered === 0 ||
          (descriptor.gaxStreamingRetries &&
            typeof retry?.getResumptionRequestFn === "function");
        if (
          eligible &&
          safe &&
          attempt < (b.maxRetries ?? settings.retryRequestOptions?.retries ?? 5)
        ) {
          const delay = retryDelay(retry, attempt++);
          if (delay < budget - (Date.now() - start)) {
            try {
              if (retry.getResumptionRequestFn)
                argument = retry.getResumptionRequestFn(argument);
            } catch (cause) {
              duplex.destroy(cause);
              return;
            }
            inner?.destroy?.();
            backoff = setTimeout(connect, delay);
            return;
          }
        }
        duplex.destroy(error);
      };
      const invoke = () =>
        descriptor.type === 1
          ? rpc(argument, metadata(settings), opts)
          : rpc(metadata(settings), opts, (error, value) => {
              if (error) onError(error);
              else {
                duplex.push(value);
                complete();
              }
            });
      inner = settings._trace
        ? tracing.traceAttempt(
            { ...settings._trace.dynamic, resendCount: attempt },
            settings._trace.statics,
            invoke,
            true,
          )
        : invoke();
      if (!inner?.on)
        throw new TypeError("Streaming RPC did not return a stream");
      inner.on("error", onError);
      inner.on("data", (value) => {
        if (stopped || failed) return;
        delivered++;
        if (!duplex.push(value)) inner.pause();
      });
      inner.on("metadata", (value) => {
        if (!failed && !stopped) {
          duplex.emit("metadata", value);
          duplex.emit("response", value);
        }
      });
      inner.on("status", (value) => {
        if (failed || stopped) return;
        statusSeen = true;
        duplex.emit("status", value);
        if (value.code)
          onError(
            Object.assign(
              new GoogleError(value.details || "RPC failed"),
              value,
            ),
          );
        else if (ended) complete();
      });
      inner.on("end", () => {
        if (failed || stopped) return;
        ended = true;
        if (
          descriptor.rest ||
          statusSeen ||
          typeof inner.getPeer !== "function"
        )
          complete();
      });
      inner.on("close", () => {
        if (!failed && !stopped && !ended)
          onError(fail(Status.UNAVAILABLE, "Stream closed before completion"));
      });
      clearTimeout(deadline);
      if (Number.isFinite(remaining))
        deadline = setTimeout(
          () =>
            onError(
              fail(Status.DEADLINE_EXCEEDED, "Streaming deadline exceeded"),
            ),
          Math.min(2147483647, remaining),
        );
      if (writePending) {
        const pending = writePending;
        writePending = null;
        inner.write(...pending);
      }
      if (finishPending) {
        const callback = finishPending;
        finishPending = null;
        inner.end(callback);
      }
    } catch (error) {
      duplex.destroy(error);
    }
  }
  if (Number.isFinite(budget))
    deadline = setTimeout(
      () =>
        duplex.destroy(
          fail(
            Status.DEADLINE_EXCEEDED,
            "Stream initialization deadline exceeded",
          ),
        ),
      Math.max(0, Math.min(budget, 2147483647)),
    );
  void connect();
  return duplex;
}
function createApiCall(func, defaults = new CallSettings(), descriptor) {
  if (
    descriptor &&
    !descriptor.streaming &&
    !(descriptor instanceof PageDescriptor)
  )
    return require("../build/src/createApiCall").createApiCall(
      func,
      defaults,
      descriptor,
    );
  const pending = Promise.resolve(func);
  pending.catch(() => {});
  return function call(request, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    const settings = defaults.merge(options);
    const invoke = (cb) => {
      if (descriptor?.streaming)
        return streaming(pending, request, settings, descriptor);
      let active,
        cancelled = false,
        rejectAbort,
        stubTimer;
      const abort = new Promise((_, reject) => {
        rejectAbort = reject;
      });
      const promise = Promise.race([
        abort,
        (async () => {
          if (Number.isFinite(settings.timeout))
            stubTimer = setTimeout(
              () =>
                rejectAbort(
                  fail(
                    Status.DEADLINE_EXCEEDED,
                    "Stub initialization deadline exceeded",
                  ),
                ),
              Math.max(0, Math.min(settings.timeout, 2147483647)),
            );
          const rpc = await Promise.race([pending, abort]);
          clearTimeout(stubTimer);
          if (cancelled) throw fail(Status.CANCELLED, "Call cancelled");
          let next = { ...request },
            items = [],
            last,
            seen = new Set();
          do {
            active = unary(rpc, next, settings);
            if (cancelled) active.cancel();
            last = await active;
            if (!descriptor) return [last, null, null];
            const page = last?.[descriptor.resourceField] ?? [],
              token = last?.[descriptor.responsePageTokenField];
            const following = token
              ? { ...next, [descriptor.requestPageTokenField]: token }
              : null;
            if (!settings.autoPaginate) return [page, following, last];
            items.push(...(Array.isArray(page) ? page : Object.entries(page)));
            if (
              settings.maxResults !== undefined &&
              items.length >= settings.maxResults
            )
              return [items.slice(0, settings.maxResults), null, null];
            if (token && seen.has(token))
              throw fail(Status.INTERNAL, "Pagination token repeated");
            if (token) seen.add(token);
            next = following;
          } while (next);
          return [items, null, null];
        })(),
      ]);
      promise.then(
        () => clearTimeout(stubTimer),
        () => clearTimeout(stubTimer),
      );
      promise.cancel = () => {
        cancelled = true;
        rejectAbort(fail(Status.CANCELLED, "Call cancelled"));
        active?.cancel();
      };
      if (cb) {
        promise.then(
          (values) => cb(null, ...values),
          (error) => cb(error),
        );
        // Generated clients use optional promise chaining on this return value.
        // Upstream callback calls return nothing; only promise calls are cancellable.
        return undefined;
      }
      return promise;
    };
    if (tracing.checkTracingEnabled(settings)) {
      const method = settings.otherArgs.internalMethodName ?? "",
        dynamic = {
          clientName: (settings.apiName?.split(".").at(-1) ?? "") + "Client",
          methodName: method,
          rpcType: descriptor?.rest ? "http" : "grpc",
        };
      const statics = tracing.resolveStaticTraceContext(settings);
      settings._trace = {
        dynamic: { ...dynamic, apiName: settings.apiName },
        statics,
      };
      return tracing.traceCall(
        dynamic,
        statics,
        invoke,
        !!descriptor?.streaming,
        callback,
      );
    }
    return invoke(callback);
  };
}
module.exports = {
  createApiCall,
  PageDescriptor,
  StreamDescriptor,
  StreamType,
};
