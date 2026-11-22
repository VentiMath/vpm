"use strict";
const start = Symbol.for("gensync:v1:start");
const suspend = Symbol.for("gensync:v1:suspend");

function fault(code, message) {
  return Object.assign(new Error(message), { code });
}

function protocolError(iterator, code, message) {
  const error = fault(code, message);
  iterator.throw?.(error);
  throw error;
}

function checkStart(iterator, value) {
  if (value !== start)
    protocolError(
      iterator,
      "GENSYNC_EXPECTED_START",
      "Got unexpected yielded value in gensync generator: " +
        String(value) +
        ". Delegate with yield*.",
    );
}

function readSync(iterator) {
  for (;;) {
    const step = iterator.next();
    if (step.done) return step.value;
    checkStart(iterator, step.value);
  }
}

// Consume immediate callbacks on the same stack frame. A deferred callback
// takes over the loop after the generator has yielded its suspension token.
function readAsync(iterator, success, failure) {
  let finished = false;
  function advance() {
    let value;
    try {
      for (;;) {
        const step = iterator.next();
        if (step.done) {
          value = step.value;
          break;
        }
        checkStart(iterator, step.value);
        let yielded = false,
          signaled = false;
        const pause = iterator.next(() => {
          if (signaled || finished) return;
          signaled = true;
          if (yielded) advance();
        });
        if (pause.done || pause.value !== suspend) {
          protocolError(
            iterator,
            "GENSYNC_EXPECTED_SUSPEND",
            pause.done
              ? "Unexpected generator completion while waiting for suspension."
              : "Expected GENSYNC_SUSPEND, got " + JSON.stringify(pause.value),
          );
        }
        yielded = true;
        if (!signaled) return;
      }
    } catch (error) {
      finished = true;
      failure(error);
      return;
    }
    finished = true;
    success(value);
  }
  advance();
}

function describe(fn, name, arity) {
  Object.defineProperties(fn, {
    name: { value: name, configurable: true },
    length: { value: arity, configurable: true },
  });
  return fn;
}

function operation(sync, dispatch, name, arity) {
  return describe(
    function* (...args) {
      const wake = yield start;
      if (!wake) return sync.apply(this, args);
      let outcome,
        rejected,
        settled = false;
      function finish(bad, result) {
        if (settled) return;
        settled = true;
        rejected = bad;
        outcome = result;
        wake();
      }
      try {
        dispatch(
          this,
          args,
          (v) => finish(false, v),
          (e) => finish(true, e),
        );
      } catch (error) {
        finish(true, error);
      }
      yield suspend;
      if (rejected) throw outcome;
      return outcome;
    },
    name,
    arity,
  );
}

function wrap(make, direct) {
  const fn = describe(
    function (...args) {
      return make.apply(this, args);
    },
    make.name,
    make.length,
  );
  return Object.assign(fn, {
    sync(...args) {
      return direct
        ? direct.apply(this, args)
        : readSync(make.apply(this, args));
    },
    async(...args) {
      return new Promise((resolve, reject) =>
        readAsync(make.apply(this, args), resolve, reject),
      );
    },
    errback(...args) {
      const cb = args.pop();
      if (typeof cb !== "function")
        throw fault(
          "GENSYNC_ERRBACK_NO_CALLBACK",
          "Asynchronous function called without callback",
        );
      let iterator;
      try {
        iterator = make.apply(this, args);
      } catch (error) {
        cb(error);
        return;
      }
      readAsync(
        iterator,
        (v) => cb(undefined, v),
        (e) => cb(e),
      );
    },
  });
}

function gensync(options) {
  if (typeof options === "function") return wrap(options);
  const { sync, async, errback, name, arity } = options ?? {};
  for (const [key, type] of Object.entries({
    sync: "function",
    async: "function",
    errback: "function",
    name: "string",
    arity: "number",
  })) {
    const value = options?.[key];
    if (typeof value !== type && (key === "sync" || value !== undefined)) {
      throw fault(
        "GENSYNC_OPTIONS_ERROR",
        "Expected opts." +
          key +
          " to be " +
          (key === "sync"
            ? "a " + type
            : "either a " + type + ", or undefined") +
          ".",
      );
    }
  }
  if (async && errback)
    throw fault(
      "GENSYNC_OPTIONS_ERROR",
      "Expected one of either opts.async or opts.errback, but got _both_.",
    );
  const label =
    name ??
    ((sync.name !== "sync" && sync.name.replace(/Sync$/, "")) ||
      (async?.name !== "async" && async?.name.replace(/Async$/, "")) ||
      (errback?.name !== "errback" && errback?.name) ||
      "");
  const dispatch = async
    ? (self, args, ok, fail) => async.apply(self, args).then(ok, fail)
    : errback
      ? (self, args, ok, fail) =>
          errback.call(self, ...args, (error, value) =>
            error == null ? ok(value) : fail(error),
          )
      : (self, args, ok) => ok(sync.apply(self, args));
  return wrap(operation(sync, dispatch, label, arity ?? sync.length), sync);
}

function raceItems(input) {
  const items = Array.from(input);
  if (!items.length)
    throw fault("GENSYNC_RACE_NONEMPTY", "Must race at least 1 item");
  return items;
}
gensync.all = operation(
  (input) => Array.from(input).map(readSync),
  (_self, [input], ok, fail) => {
    const items = Array.from(input),
      values = new Array(items.length);
    let remaining = items.length;
    if (!remaining) {
      queueMicrotask(() => ok(values));
      return;
    }
    items.forEach((item, index) =>
      readAsync(
        item,
        (value) => {
          values[index] = value;
          if (--remaining === 0) ok(values);
        },
        fail,
      ),
    );
  },
  "all",
  1,
);
gensync.race = operation(
  (input) => readSync(raceItems(input)[0]),
  (_self, [input], ok, fail) => {
    for (const item of raceItems(input)) readAsync(item, ok, fail);
  },
  "race",
  1,
);

module.exports = gensync;
