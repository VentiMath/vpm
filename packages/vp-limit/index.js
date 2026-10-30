'use strict';
const Queue = require('vyocto-queue');
const ready = Promise.resolve();

function validateConcurrency(value) {
  if (!(value > 0 && (Number.isInteger(value) || value === Infinity))) {
    throw new TypeError('Expected `concurrency` to be a number from 1 and up');
  }
}

function pLimit(concurrency) {
  let rejectOnClear = false;
  if (concurrency !== null && typeof concurrency === 'object') {
    ({ concurrency, rejectOnClear = false } = concurrency);
  }
  validateConcurrency(concurrency);
  if (typeof rejectOnClear !== 'boolean') throw new TypeError('Expected `rejectOnClear` to be a boolean');
  const queue = new Queue();
  let activeCount = 0;

  function resumeNext() {
    if (activeCount < concurrency && queue.size) {
      activeCount++;
      queue.dequeue().run();
    }
  }

  async function run(fn, resolve, args) {
    const result = (async () => fn(...args))();
    resolve(result);
    try { await result; } catch {}
    activeCount--;
    resumeNext();
  }

  const limit = (fn, ...args) => new Promise((resolve, reject) => {
    // Register the continuation in the submitting caller's async context.
    // An available slot needs neither a queue node nor an intermediate promise.
    if (activeCount < concurrency && queue.size === 0) {
      activeCount++;
      ready.then(() => run(fn, resolve, args));
    } else {
      new Promise(start => queue.enqueue({ run: start, reject }))
        .then(() => run(fn, resolve, args));
      resumeNext();
    }
  });

  Object.defineProperties(limit, {
    activeCount: { get: () => activeCount },
    pendingCount: { get: () => queue.size },
    concurrency: {
      get: () => concurrency,
      set(value) {
        validateConcurrency(value);
        concurrency = value;
        queueMicrotask(() => {
          while (activeCount < concurrency && queue.size) resumeNext();
        });
      },
    },
    clearQueue: {
      value() {
        if (!rejectOnClear) { queue.clear(); return; }
        const error = AbortSignal.abort().reason;
        while (queue.size) queue.dequeue().reject(error);
      },
    },
    map: {
      async value(iterable, mapper) {
        const promises = [];
        try {
          Array.from(iterable, (value, index) => {
            const promise = limit(mapper, value, index);
            promises.push(promise);
            return promise;
          });
        } catch (error) {
          // Iteration may fail after scheduling work. Observe every result.
          for (const promise of promises) promise.catch(() => {});
          throw error;
        }
        return Promise.all(promises);
      },
    },
  });
  return limit;
}

function limitFunction(fn, options) {
  const limit = pLimit(options);
  const limited = (...args) => limit(fn, ...args);
  Object.defineProperty(limited, 'clearQueue', { value: limit.clearQueue });
  return limited;
}
module.exports = pLimit;
module.exports.limitFunction = limitFunction;
