"use strict";
// Independent request pipeline. Fetch owns redirects, credentials and wire transport.
const MAX_TIMER = 2147483647;
const STOP = Symbol("vky.stop");
const replacements = new WeakMap();
const hookNames = [
  "init",
  "beforeRequest",
  "beforeRetry",
  "afterResponse",
  "beforeError",
];
const nativeKeys = [
  "method",
  "body",
  "credentials",
  "cache",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "integrity",
  "keepalive",
  "priority",
  "duplex",
];
const plain = (x) =>
  x !== null &&
  typeof x === "object" &&
  (Object.getPrototypeOf(x) === Object.prototype ||
    Object.getPrototypeOf(x) === null);
const own = (x, k) => Object.prototype.hasOwnProperty.call(x, k);
class KyError extends Error {
  constructor(...args) {
    super(...args);
    this.name = "KyError";
  }
  get isKyError() {
    return true;
  }
}
class HTTPError extends KyError {
  constructor(response, request, options) {
    super(
      `Request failed with status code ${response.status}${response.statusText ? " " + response.statusText : ""}: ${request.method} ${request.url}`,
    );
    this.name = "HTTPError";
    this.response = response;
    this.request = request;
    this.options = options;
    this.data = undefined;
  }
}
class TimeoutError extends KyError {
  constructor(request) {
    super(`Request timed out: ${request.method} ${request.url}`);
    this.name = "TimeoutError";
    this.request = request;
  }
}
class NetworkError extends KyError {
  constructor(request, options) {
    super("Network request failed", options);
    this.name = "NetworkError";
    this.request = request;
  }
}
class ResponseSizeError extends KyError {
  constructor(request, maxResponseSize) {
    super(`Response exceeds maxResponseSize of ${maxResponseSize} bytes`);
    this.name = "ResponseSizeError";
    this.request = request;
    this.maxResponseSize = maxResponseSize;
  }
}
const isKyError = (x) => !!x && x.isKyError === true;
const kind = (name) => (x) => isKyError(x) && x.name === name;
const errors = {
  KyError,
  HTTPError,
  TimeoutError,
  NetworkError,
  ResponseSizeError,
  isKyError,
  isHTTPError: kind("HTTPError"),
  isTimeoutError: kind("TimeoutError"),
  isNetworkError: kind("NetworkError"),
  isResponseSizeError: kind("ResponseSizeError"),
};
function replaceOption(value) {
  const box = Object.freeze({});
  replacements.set(box, value);
  return box;
}
function copy(x) {
  if (x instanceof URLSearchParams) return new URLSearchParams(x);
  if (Array.isArray(x)) return x.map(copy);
  if (plain(x))
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, copy(v)]));
  return x;
}
function mergeValue(a, b) {
  if (b && typeof b === "object" && replacements.has(b))
    return copy(replacements.get(b));
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  if (plain(a) && plain(b)) {
    const out = { ...a };
    for (const k of Object.keys(b))
      Object.defineProperty(out, k, {
        value: mergeValue(a[k], b[k]),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    return out;
  }
  return copy(b);
}
function headerRecord(value) {
  if (value === undefined) return {};
  if (plain(value))
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k.toLowerCase(), v]),
    );
  return Object.fromEntries(new Headers(value));
}
function searchEntries(value) {
  return plain(value)
    ? Object.entries(value)
    : Array.isArray(value)
      ? value
      : [...new URLSearchParams(value)];
}
function merge(a, b, legacy = false) {
  if (!plain(b)) throw new TypeError("options must be an object");
  const out = { ...a };
  for (const key of Object.keys(b)) {
    const v = b[key];
    if (key === "signal")
      out.signal =
        v === undefined
          ? undefined
          : replacements.has(v)
            ? replacements.get(v)
            : combine([a.signal, v]);
    else if (key === "headers" && v !== undefined && !replacements.has(v))
      out.headers = { ...headerRecord(a.headers), ...headerRecord(v) };
    else if (
      key === "searchParams" &&
      !legacy &&
      a[key] !== undefined &&
      v !== undefined &&
      !replacements.has(v)
    )
      out[key] = [...searchEntries(a[key]), ...searchEntries(v)];
    else if (key === "context" && plain(v))
      out.context = { ...a.context, ...v };
    else if (
      ["json", "hooks", "retry", "searchParams"].includes(key) ||
      key === "headers"
    )
      out[key] = mergeValue(a[key], v);
    else
      Object.defineProperty(out, key, {
        value: v,
        writable: true,
        enumerable: true,
        configurable: true,
      });
  }
  return out;
}
const retryDefaults = {
  limit: 2,
  methods: ["get", "put", "head", "delete", "options", "trace", "query"],
  statusCodes: [408, 413, 429, 500, 502, 503, 504],
  afterStatusCodes: [413, 429, 503],
  maxRetryAfter: Infinity,
  backoffLimit: Infinity,
  delay: (n) => 300 * 2 ** (n - 1),
  retryOnTimeout: false,
};
function duration(v, name, allowInfinity = false) {
  if (v === false && !allowInfinity) return;
  if (typeof v !== "number" || Number.isNaN(v) || v < 0)
    throw new TypeError(
      `${name} must be a non-negative number${allowInfinity ? "" : " or false"}`,
    );
  if (!allowInfinity && v > MAX_TIMER)
    throw new RangeError(`${name} exceeds the maximum timer duration`);
}
function normalize(raw, legacy) {
  const o = {
    timeout: 10000,
    totalTimeout: false,
    maxResponseSize: Infinity,
    throwHttpErrors: true,
    ...raw,
  };
  for (const k of ["onUploadProgress", "onDownloadProgress"])
    if (o[k] !== undefined)
      throw new TypeError(`${k} is outside the verified request contract`);
  if (!legacy && o.prefixUrl !== undefined)
    throw new TypeError(
      "prefixUrl requires vky/legacy; use prefix or baseUrl with vky",
    );
  o.headers = headerRecord(o.headers);
  o.context = { ...o.context };
  const hooks = o.hooks === undefined ? {} : o.hooks;
  if (!plain(hooks)) throw new TypeError("hooks must be an object");
  o.hooks = {};
  for (const k of hookNames) {
    const h = hooks[k] === undefined ? [] : hooks[k];
    if (!Array.isArray(h) || h.some((f) => typeof f !== "function"))
      throw new TypeError(`hooks.${k} must be an array of functions`);
    o.hooks[k] = [...h];
  }
  if (o.hooks.init.length) {
    o.json = copy(o.json);
    o.searchParams = copy(o.searchParams);
    o.retry = copy(o.retry);
    for (const f of o.hooks.init)
      if (f(o)?.then) throw new TypeError("init hooks must be synchronous");
  }
  duration(o.timeout, "timeout");
  duration(o.totalTimeout, "totalTimeout");
  if (
    o.maxResponseSize !== Infinity &&
    (!Number.isSafeInteger(o.maxResponseSize) || o.maxResponseSize < 0)
  )
    throw new TypeError(
      "maxResponseSize must be a non-negative safe integer or Infinity",
    );
  if (
    typeof o.throwHttpErrors !== "boolean" &&
    typeof o.throwHttpErrors !== "function"
  )
    throw new TypeError("throwHttpErrors must be boolean or a function");
  const r = o.retry;
  if (r !== undefined && typeof r !== "number" && !plain(r))
    throw new TypeError("retry must be a number or object");
  o.retry = { ...retryDefaults, ...(typeof r === "number" ? { limit: r } : r) };
  if (!Number.isSafeInteger(o.retry.limit) || o.retry.limit < 0)
    throw new TypeError("retry.limit must be a non-negative integer");
  for (const k of ["methods", "statusCodes", "afterStatusCodes"]) {
    if (
      !Array.isArray(o.retry[k]) ||
      o.retry[k].some((v) =>
        k === "methods" ? typeof v !== "string" : !Number.isInteger(v),
      )
    )
      throw new TypeError(`retry.${k} is invalid`);
    o.retry[k] = [...o.retry[k]];
  }
  for (const k of ["maxRetryAfter", "backoffLimit"])
    duration(o.retry[k], `retry.${k}`, true);
  if (typeof o.retry.delay !== "function")
    throw new TypeError("retry.delay must be a function");
  if (
    o.retry.shouldRetry !== undefined &&
    typeof o.retry.shouldRetry !== "function"
  )
    throw new TypeError("retry.shouldRetry must be a function");
  if (
    o.retry.jitter !== undefined &&
    typeof o.retry.jitter !== "boolean" &&
    typeof o.retry.jitter !== "function"
  )
    throw new TypeError("retry.jitter must be boolean or a function");
  if (typeof o.retry.retryOnTimeout !== "boolean")
    throw new TypeError("retry.retryOnTimeout must be boolean");
  for (const k of ["fetch", "parseJson", "stringifyJson"])
    if (o[k] !== undefined && typeof o[k] !== "function")
      throw new TypeError(`${k} must be a function`);
  for (const k of ["prefix", "prefixUrl", "baseUrl"])
    if (
      o[k] !== undefined &&
      typeof o[k] !== "string" &&
      !(o[k] instanceof URL)
    )
      throw new TypeError(`${k} must be a URL or string`);
  return o;
}
function applySearch(url, value, legacy) {
  if (value === undefined) return;
  if (legacy) {
    if (value === "") return;
    url.search = new URLSearchParams(value).toString();
    return;
  }
  const entries = searchEntries(value);
  for (const [k, v] of entries)
    if (v !== undefined) url.searchParams.append(k, String(v));
  for (const [k, v] of entries) if (v === undefined) url.searchParams.delete(k);
}
function prepare(input, o, legacy, accept) {
  if (
    typeof input !== "string" &&
    !(input instanceof URL) &&
    !(input instanceof Request)
  )
    throw new TypeError("input must be a string, URL or Request");
  let target = input;
  if (!(input instanceof Request)) {
    if (typeof input === "string") {
      const prefix = legacy ? o.prefixUrl : o.prefix;
      if (prefix) {
        if (legacy && input.startsWith("/"))
          throw new TypeError(
            "input must not begin with / when using prefixUrl",
          );
        target =
          String(prefix).replace(/\/+$/, "") + "/" + input.replace(/^\/+/, "");
      }
    }
    const environment =
      globalThis.document?.baseURI || globalThis.location?.href;
    const base = o.baseUrl
      ? new URL(String(o.baseUrl), environment).href
      : environment;
    target = new URL(String(target), base);
    applySearch(target, o.searchParams, legacy);
  } else if (o.searchParams !== undefined) {
    const u = new URL(input.url);
    applySearch(u, o.searchParams, legacy);
    target = new Request(u, input);
  }
  const headers = new Headers(
    input instanceof Request ? input.headers : undefined,
  );
  for (const [k, v] of Object.entries(o.headers))
    if (v === undefined) headers.delete(k);
    else headers.set(k, String(v));
  if (accept && !headers.has("accept")) headers.set("accept", accept);
  const init = { headers };
  for (const k of nativeKeys) if (o[k] !== undefined) init[k] = o[k];
  if (o.json !== undefined) {
    init.body = (o.stringifyJson ?? JSON.stringify)(o.json);
    if (!headers.has("content-type"))
      headers.set("content-type", "application/json");
  }
  if (init.body instanceof ReadableStream) init.duplex = "half";
  if (o.signal || input instanceof Request)
    init.signal = combine([
      input instanceof Request ? input.signal : undefined,
      o.signal,
    ]);
  const request = new Request(target, init);
  o.method = request.method;
  o.headers = headers;
  return request;
}
function cancel(response) {
  try {
    response?.body?.cancel().catch(() => {});
  } catch {}
}
function awaitSignal(promise, signal) {
  if (!signal) return Promise.resolve(promise);
  return new Promise((resolve, reject) => {
    let done = false;
    const abort = () => {
      if (!done) {
        done = true;
        signal.removeEventListener("abort", abort);
        reject(signal.reason);
      }
    };
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        if (done) {
          if (value instanceof Response) cancel(value);
          return;
        }
        done = true;
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        if (done) return;
        done = true;
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}
function combine(signals) {
  const s = signals.filter(Boolean);
  return s.length > 1 ? AbortSignal.any(s) : s[0];
}
function checkSignal(signal) {
  if (signal?.aborted) throw signal.reason;
}
function timeScope(job) {
  const controller = new AbortController();
  return { controller, signal: combine([job.signal, controller.signal]) };
}
async function timed(job, timeout, work, scope = timeScope(job)) {
  const { controller, signal } = scope;
  checkSignal(signal);
  const budget = Math.min(
    timeout === false ? Infinity : timeout,
    job.deadline === undefined
      ? Infinity
      : Math.max(0, job.deadline - performance.now()),
  );
  const timer =
    budget === Infinity
      ? null
      : setTimeout(
          () => controller.abort(new TimeoutError(job.request)),
          budget,
        );
  try {
    return await awaitSignal(
      Promise.resolve().then(() => {
        checkSignal(signal);
        return work(signal);
      }),
      signal,
    );
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}
function limitResponse(response, job, limit = job.options.maxResponseSize) {
  if (
    limit === Infinity ||
    !response.body ||
    [0, 101, 204, 205, 304].includes(response.status)
  )
    return response;
  const reader = response.body.getReader();
  let count = 0;
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        count += value.byteLength;
        if (count > limit) {
          const e = new ResponseSizeError(job.request, limit);
          controller.error(e);
          reader.cancel(e).catch(() => {});
        } else controller.enqueue(value);
      } catch (e) {
        controller.error(e);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  const wrapped = new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  for (const k of ["url", "type", "redirected"])
    Object.defineProperty(wrapped, k, { value: response[k] });
  return wrapped;
}
const network = (e) =>
  e?.name === "NetworkError" ||
  /^(ECONN|ENOTFOUND|EAI_|EPIPE|UND_ERR)/.test(
    e?.code ?? e?.cause?.code ?? "",
  ) ||
  (e instanceof TypeError &&
    /fetch|network|load failed|connection|socket/i.test(e.message));
function translate(e, job) {
  checkSignal(job.signal);
  return !job.legacy && !isKyError(e) && network(e)
    ? new NetworkError(job.request, { cause: e })
    : e;
}
async function readBytes(response, signal) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  const abort = () => {
    reader.cancel(signal.reason).catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    for (;;) {
      checkSignal(signal);
      // Canceling the reader settles a pending read. The enclosing body
      // deadline races the whole operation, avoiding a listener per chunk.
      const { value, done } = await reader.read();
      checkSignal(signal);
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
  } catch (e) {
    reader.cancel(e).catch(() => {});
    throw e;
  } finally {
    signal?.removeEventListener("abort", abort);
    reader.releaseLock();
  }
  if (chunks.length === 1) return chunks[0];
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const part of chunks) {
    bytes.set(part, at);
    at += part.byteLength;
  }
  return bytes;
}
async function body(job, response, type, errorData = false) {
  try {
    const result = await timed(
      job,
      errorData
        ? job.options.timeout === false
          ? 10000
          : job.options.timeout
        : job.options.timeout,
      async (signal) => {
        const r = errorData
          ? limitResponse(
              response,
              job,
              Math.min(10 * 1024 * 1024, job.options.maxResponseSize),
            )
          : response;
        const bytes = await readBytes(r, signal);
        if (type === "bytes") return bytes;
        if (type === "arrayBuffer")
          return bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          );
        if (type === "blob")
          return new Blob([bytes], {
            type: r.headers.get("content-type") ?? "",
          });
        if (type === "formData")
          return new Response(bytes, { headers: r.headers }).formData();
        const raw = new TextDecoder().decode(bytes);
        if (errorData && raw === "") return undefined;
        if (type === "text") return raw;
        if (job.legacy && (r.status === 204 || raw === "")) return "";
        const parsed = (job.options.parseJson ?? JSON.parse)(raw, {
          request: job.request,
          response: r,
        });
        return parsed?.then ? await awaitSignal(parsed, signal) : parsed;
      },
      job.responseScope,
    );
    checkSignal(job.signal);
    return result;
  } catch (e) {
    throw translate(e, job);
  }
}
async function decorateError(error, job) {
  let e = error;
  for (const f of job.options.hooks.beforeError) {
    if (job.legacy && !(e instanceof HTTPError)) break;
    const next = await f(
      job.legacy
        ? e
        : {
            request: job.request,
            options: job.options,
            error: e,
            retryCount: job.count,
          },
    );
    if (next !== undefined) {
      if (!(next instanceof Error))
        throw new TypeError("beforeError must return an Error");
      e = next;
    }
  }
  return e;
}
async function httpError(response, job) {
  const error = new HTTPError(response, job.request, job.options);
  if (!job.legacy) {
    try {
      error.data = await body(
        job,
        response,
        /\bjson\b/i.test(response.headers.get("content-type") ?? "")
          ? "json"
          : "text",
        true,
      );
    } catch (e) {
      if (
        job.signal?.aborted ||
        (e instanceof ResponseSizeError &&
          e.maxResponseSize === job.options.maxResponseSize)
      )
        throw e;
    }
  }
  return error;
}
function retryHeader(response) {
  for (const key of [
    "retry-after",
    "ratelimit-reset",
    "x-ratelimit-retry-after",
    "x-ratelimit-reset",
    "x-rate-limit-reset",
  ]) {
    const value = response?.headers.get(key);
    if (value === null || value === undefined) continue;
    const n = Number(value);
    if (value.trim() && Number.isFinite(n))
      return Math.max(
        0,
        n >= 1e9 && key !== "retry-after" && key !== "x-ratelimit-retry-after"
          ? n * 1000 - Date.now()
          : n * 1000,
      );
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
}
async function delay(ms, signal) {
  while (ms > 0) {
    const part = Math.min(ms, MAX_TIMER);
    let timer;
    try {
      await awaitSignal(
        new Promise((r) => {
          timer = setTimeout(r, part);
        }),
        signal,
      );
    } finally {
      clearTimeout(timer);
    }
    ms -= part;
  }
  checkSignal(signal);
}
async function retryDelay(error, job) {
  const r = job.options.retry,
    count = job.count + 1;
  if (
    count > r.limit ||
    !r.methods.some((m) => m.toUpperCase() === job.request.method)
  )
    return null;
  const decision = r.shouldRetry
    ? await awaitSignal(r.shouldRetry({ error, retryCount: count }), job.signal)
    : undefined;
  if (decision === false) return null;
  const response = error instanceof HTTPError ? error.response : undefined;
  const header =
    response && r.afterStatusCodes.includes(response.status)
      ? retryHeader(response)
      : undefined;
  const eligible = response
    ? r.statusCodes.includes(response.status) &&
      (response.status !== 413 || header !== undefined)
    : error instanceof TimeoutError
      ? r.retryOnTimeout
      : job.legacy
        ? network(error)
        : error instanceof NetworkError;
  if (decision !== true && !eligible) return null;
  if (header !== undefined) return Math.min(header, r.maxRetryAfter);
  let ms = r.delay(count);
  duration(ms, "retry.delay result", true);
  ms = Math.min(ms, r.backoffLimit);
  if (r.jitter)
    ms = typeof r.jitter === "function" ? r.jitter(ms) : Math.random() * ms;
  duration(ms, "retry jitter result", true);
  return ms;
}
async function dispatch(job, template, shortcut) {
  checkSignal(job.signal);
  const o = job.options;
  let cached;
  async function beforeRequest() {
    for (const f of o.hooks.beforeRequest) {
      const result = await awaitSignal(
        job.legacy
          ? f(template, o, { retryCount: job.count })
          : f({ request: template, options: o, retryCount: job.count }),
        job.signal,
      );
      if (result instanceof Response) {
        cached = result;
        break;
      }
      if (result instanceof Request) {
        template = result;
        if (job.legacy) break;
      }
    }
  }
  await beforeRequest();
  job.request = template;
  for (;;) {
    checkSignal(job.signal);
    let failure;
    try {
      let response = cached;
      cached = undefined;
      // Every attempt owns one signal through headers and body consumption.
      // Retry/cached responses must not inherit a previous attempt's timeout.
      job.responseScope = undefined;
      if (!response) {
        job.responseScope = timeScope(job);
        response = await timed(
          job,
          o.timeout,
          (signal) => {
            job.request = new Request(
              template.body ? template.clone() : template,
              { signal },
            );
            const extra = {};
            for (const k of ["dispatcher", "next"])
              if (o[k] !== undefined) extra[k] = o[k];
            return (o.fetch ?? globalThis.fetch)(job.request, extra);
          },
          job.responseScope,
        );
      }
      if (!(response instanceof Response))
        throw new TypeError("fetch must return a Response");
      response = limitResponse(response, job);
      for (const f of o.hooks.afterResponse) {
        const clone = response.clone();
        let result;
        try {
          result = await awaitSignal(
            job.legacy
              ? f(job.request, o, clone, { retryCount: job.count })
              : f({
                  request: job.request,
                  options: o,
                  response: clone,
                  retryCount: job.count,
                }),
            job.signal,
          );
        } finally {
          if (result !== clone) cancel(clone);
        }
        if (result instanceof Response) {
          if (result !== response) cancel(response);
          response = limitResponse(result, job);
        }
      }
      const shouldThrow =
        typeof o.throwHttpErrors === "function"
          ? o.throwHttpErrors(response.status)
          : o.throwHttpErrors;
      if (!response.ok && response.type !== "opaque" && shouldThrow)
        throw await httpError(response, job);
      return response;
    } catch (e) {
      failure = translate(e, job);
    }
    const ms = await retryDelay(failure, job);
    if (ms === null) throw failure;
    cancel(failure.response);
    await delay(ms, job.signal);
    job.count++;
    for (const f of o.hooks.beforeRetry) {
      const result = await awaitSignal(
        f({
          request: template,
          options: o,
          error: failure,
          retryCount: job.count,
        }),
        job.signal,
      );
      if (result === STOP) return undefined;
      if (result instanceof Request) template = result;
      else if (result instanceof Response) {
        cached = result;
        break;
      } else if (result?.options) {
        for (const key of Object.keys(result.options)) {
          if (!["timeout", "fetch", "throwHttpErrors"].includes(key))
            throw new TypeError(
              `beforeRetry options.${key} is outside the verified contract`,
            );
          const v = result.options[key];
          o[key] =
            v === undefined
              ? { timeout: 10000, fetch: undefined, throwHttpErrors: true }[key]
              : v;
          if (
            key === "fetch" &&
            o[key] !== undefined &&
            typeof o[key] !== "function"
          )
            throw new TypeError("fetch must be a function");
          if (
            key === "throwHttpErrors" &&
            !["boolean", "function"].includes(typeof o[key])
          )
            throw new TypeError(
              "throwHttpErrors must be boolean or a function",
            );
        }
        duration(o.timeout, "timeout");
      }
    }
    if (job.legacy && !cached) await beforeRequest();
    job.request = template;
  }
}
function makeClient(defaults = {}, legacy = false) {
  function client(input, options = {}) {
    let shortcut, job;
    const task = Promise.resolve().then(async () => {
      const o = normalize(merge(defaults, options, legacy), legacy);
      const request = prepare(
        input,
        o,
        legacy,
        shortcut === "json"
          ? "application/json"
          : shortcut === "text"
            ? "text/*"
            : undefined,
      );
      const total =
        o.totalTimeout === false ? undefined : new AbortController();
      job = {
        options: o,
        legacy,
        request,
        count: 0,
        // prepare() already combines the input and configured signals.
        signal: total
          ? combine([request.signal, total.signal])
          : request.signal,
        totalTimer: null,
        deadline:
          o.totalTimeout === false
            ? undefined
            : performance.now() + o.totalTimeout,
      };
      if (o.totalTimeout !== false)
        job.totalTimer = setTimeout(
          () => total.abort(new TimeoutError(job.request)),
          o.totalTimeout,
        );
      try {
        return await dispatch(job, request, shortcut);
      } catch (e) {
        throw await decorateError(e, job);
      } finally {
        if (!shortcut) clearTimeout(job.totalTimer);
      }
    });
    for (const type of [
      "json",
      "text",
      "blob",
      "arrayBuffer",
      "formData",
      "bytes",
    ])
      Object.defineProperty(task, type, {
        value: (schema) => {
          shortcut = type;
          return task.then(
            async (response) => {
              try {
                if (!response) return undefined;
                if (schema !== undefined)
                  throw new TypeError(
                    "Schema validation is outside the verified JSON contract",
                  );
                return await body(job, response, type);
              } catch (e) {
                throw await decorateError(e, job);
              } finally {
                clearTimeout(job.totalTimer);
              }
            },
            (e) => {
              clearTimeout(job?.totalTimer);
              throw e;
            },
          );
        },
      });
    return task;
  }
  for (const method of [
    "get",
    "post",
    "put",
    "patch",
    "head",
    "delete",
    "query",
  ])
    client[method] = (input, options) =>
      client(
        input,
        options !== undefined && !plain(options)
          ? options
          : { ...options, method: method.toUpperCase() },
      );
  client.create = (options) =>
    makeClient(merge({}, options === undefined ? {} : options, legacy), legacy);
  client.extend = (options) =>
    makeClient(
      merge(
        defaults,
        typeof options === "function"
          ? options(copy(defaults))
          : options === undefined
            ? {}
            : options,
        legacy,
      ),
      legacy,
    );
  client.stop = STOP;
  return client;
}
module.exports = { makeClient, replaceOption, ...errors };
