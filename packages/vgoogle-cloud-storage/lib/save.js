'use strict';
const {pipeline, finished} = require('node:stream');
const retry = require('vasync-retry');
const {validateContexts} = require('./util.js');
const uploadPolicy = Symbol('VPM save retry policy');
exports.uploadPolicy = uploadPolicy;

// Capture plain option records without invoking prototype setters or retaining
// caller-owned metadata across stream setup and retries. Opaque providers keep
// their identity; byte payloads have a separate copy below.
function snapshot(value) {
  const seen = new Map(), pending = [];
  function capture(input) {
    if (!input || typeof input !== 'object') return input;
    const prototype = Object.getPrototypeOf(input);
    if (!Array.isArray(input) && prototype !== Object.prototype && prototype !== null) return input;
    if (seen.has(input)) return seen.get(input);
    const output = Array.isArray(input) ? new Array(input.length) : {};
    seen.set(input, output); pending.push([input, output]); return output;
  }
  const result = capture(value);
  while (pending.length) {
    const [input, output] = pending.pop();
    for (const key of Object.keys(input)) Object.defineProperty(output, key, {value: capture(input[key]), enumerable: true, writable: true, configurable: true});
  }
  return result;
}

function writeAttempt(file, data, options) {
  return new Promise((resolve, reject) => {
    let stream;
    try {
      stream = file.createWriteStream(options);
      if (options.onUploadProgress) stream.on('progress', options.onUploadProgress);
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        const stop = finished(stream, {readable: false}, error => { stop(); error ? reject(error) : resolve(); });
        stream.end(data);
      } else pipeline(data, stream, error => error ? reject(error) : resolve());
    } catch (error) {
      // Synchronous factory/end failures still settle through the public promise.
      if (stream && !stream.destroyed) stream.destroy();
      reject(error);
    }
  });
}
exports.save = function save(file, input, optionsOrCallback, callback) {
  if (typeof optionsOrCallback === 'function') callback = optionsOrCallback;
  let options, data, policy, replayable;
  try {
    options = snapshot(optionsOrCallback && typeof optionsOrCallback === 'object' ? optionsOrCallback : {});
    validateContexts(options.metadata?.contexts);
    policy = {...file.storage.retryOptions};
    const allowed = file.shouldRetryBasedOnPreconditionAndIdempotencyStrat(options.preconditionOpts);
    policy.autoRetry = policy.autoRetry !== false && allowed;
    if (!policy.autoRetry) policy.maxRetries = 0;
    data = Buffer.isBuffer(input) || input instanceof Uint8Array ? Buffer.from(input) : input;
    replayable = typeof data === 'string' || Buffer.isBuffer(data) || typeof data === 'function';
  } catch (error) {
    if (callback) { callback(error); return; }
    return Promise.reject(error);
  }
  function upload(attempt) {
    attempt[uploadPolicy] = policy;
    return writeAttempt(file, data, attempt);
  }
  // A one-shot upload needs neither a retry operation nor a second options copy.
  const operation = !replayable || !policy.autoRetry || policy.maxRetries === 0
    ? upload(options)
    : retry(async bail => {
      try { await upload(snapshot(options)); }
      catch (error) {
        if (!policy.retryableErrorFn(error)) return bail(error);
        throw error;
      }
    }, {retries: policy.maxRetries, factor: policy.retryDelayMultiplier,
      maxTimeout: policy.maxRetryDelay * 1000, maxRetryTime: policy.totalTimeout * 1000});
  return callback ? operation.then(() => callback(), error => callback(error)) : operation;
};
