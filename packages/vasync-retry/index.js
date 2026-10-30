'use strict';
const retrier = require('vretry');

function retry(fn, options) {
  return new Promise((resolve,reject) => {
    if (typeof fn !== 'function') throw new TypeError('retry task must be a function');
    if (options != null && (typeof options !== 'object' || Array.isArray(options))) throw new TypeError('options must be an object');
    const config = {...options};
    if (config.randomize === undefined) config.randomize = true;
    const onRetry = config.onRetry;
    if (onRetry !== undefined && typeof onRetry !== 'function') throw new TypeError('onRetry must be a function');
    const op = retrier.operation(config);
    let settled = false;
    function finish(success, value) {
      if (settled) return;
      settled = true;
      op.stop();
      if (success) resolve(value); else reject(value);
    }
    const bail = error => finish(false,error || new Error('Aborted'));
    function failed(error, attempt) {
      if (settled) return;
      try {
        if (error && error.bail) { bail(error); return; }
        const failure = error || Object.assign(new Error('Task rejected with a falsy reason',{cause:error}),{code:'ERR_FALSY_REJECTION'});
        if (!op.retry(failure)) { finish(false,op.mainError()); return; }
        if (onRetry) {
          const result = onRetry(failure,attempt);
          // Observe asynchronous hooks too; rejection stops pending retries.
          if (result != null && (typeof result === 'object' || typeof result === 'function')) Promise.resolve(result).then(undefined,error=>finish(false,error));
        }
      } catch (error) { finish(false,error); }
    }
    op.attempt(attempt => {
      if (settled) return;
      let result;
      try { result = fn(bail,attempt); } catch (error) { failed(error,attempt); return; }
      // Even a task that called bail may return a rejected thenable. Observe it.
      Promise.resolve(result).then(value=>finish(true,value),error=>failed(error,attempt));
    });
  });
}
module.exports = retry;
