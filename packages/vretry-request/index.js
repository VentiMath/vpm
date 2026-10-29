'use strict';

const {PassThrough} = require('node:stream');
const MAX_TIMER = 2147483647;
const ignoreError = () => {};

function shouldRetry(response) {
  const status = response?.statusCode;
  return status >= 100 && status <= 199 || status === 429 || status >= 500 && status <= 599;
}

const defaults = {
  objectMode: false, retries: 2, maxRetryDelay: 64, retryDelayMultiplier: 2,
  totalTimeout: 600, noResponseRetries: 2, currentRetryAttempt: 0,
  shouldRetryFn: shouldRetry,
};

function nonnegative(value, name, integer = false) {
  if (!Number.isFinite(value) || value < 0 || integer && !Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a finite nonnegative ${integer ? 'safe integer' : 'number'}`);
  }
}

function delay(max, multiplier, attempt, remaining) {
  return Math.max(0, Math.min(multiplier ** attempt * 1000 + Math.floor(Math.random() * 1000), max * 1000, remaining));
}

function getNextRetryDelay(config) {
  nonnegative(config.maxRetryDelay, 'maxRetryDelay');
  nonnegative(config.retryDelayMultiplier, 'retryDelayMultiplier');
  nonnegative(config.totalTimeout, 'totalTimeout');
  nonnegative(config.retryNumber, 'retryNumber', true);
  if (!Number.isFinite(config.timeOfFirstRequest)) throw new RangeError('timeOfFirstRequest must be finite');
  return delay(config.maxRetryDelay, config.retryDelayMultiplier, config.retryNumber,
    config.totalTimeout * 1000 - (Date.now() - config.timeOfFirstRequest));
}

function cancel(request) {
  if (!request) return;
  try {
    if (typeof request.abort === 'function') request.abort();
    else if (typeof request.cancel === 'function') request.cancel();
  } finally {
    if (typeof request.destroy === 'function' && !request.destroyed) request.destroy();
  }
}

function timeoutError() {
  const error = new Error('Retry deadline exceeded before the first attempt');
  error.code = 'ETIMEDOUT';
  return error;
}

function option(options, key) {
  if (options == null || !Object.hasOwn(options, key)) return defaults[key];
  const value = options[key];
  return value === undefined ? defaults[key] : value;
}

function retryRequest(requestOpts, options, callback) {
  if (typeof options === 'function') { callback = options; options = undefined; }
  if (options != null && typeof options !== 'object') throw new TypeError('Retry options must be an object');
  if (callback !== undefined && typeof callback !== 'function') throw new TypeError('Callback must be a function');
  if (typeof requestOpts === 'string') requestOpts = {url: requestOpts};
  const ownAttempt = options != null && Object.hasOwn(options, 'currentRetryAttempt') ? options.currentRetryAttempt : undefined;
  const manualAttempt = ownAttempt !== undefined;
  // This caller needs a fixed option record, not general-purpose object merging.
  const opts = {
    request: option(options, 'request'), objectMode: option(options, 'objectMode'),
    retries: option(options, 'retries'), noResponseRetries: option(options, 'noResponseRetries'),
    currentRetryAttempt: manualAttempt ? ownAttempt : defaults.currentRetryAttempt,
    maxRetryDelay: option(options, 'maxRetryDelay'), retryDelayMultiplier: option(options, 'retryDelayMultiplier'),
    totalTimeout: option(options, 'totalTimeout'), shouldRetryFn: option(options, 'shouldRetryFn'),
  };
  if (typeof opts.request !== 'function') throw new TypeError('A request library must be provided to vretry-request.');
  if (typeof opts.shouldRetryFn !== 'function') throw new TypeError('shouldRetryFn must be a function');
  nonnegative(opts.retries, 'retries', true);
  nonnegative(opts.noResponseRetries, 'noResponseRetries', true);
  nonnegative(opts.currentRetryAttempt, 'currentRetryAttempt', true);
  nonnegative(opts.maxRetryDelay, 'maxRetryDelay');
  nonnegative(opts.retryDelayMultiplier, 'retryDelayMultiplier');
  nonnegative(opts.totalTimeout, 'totalTimeout');
  if (typeof opts.objectMode !== 'boolean') throw new TypeError('objectMode must be a boolean');
  return callback ? callbacks(requestOpts, opts, callback, manualAttempt) : streams(requestOpts, opts, manualAttempt);
}

function callbacks(requestOpts, opts, callback, manualAttempt) {
  const started = performance.now();
  let attempt = opts.currentRetryAttempt, noResponse = 0, timer, active, stopped = false, aborted = false;
  const handle = {abort() {
    if (stopped) return;
    stopped = aborted = true;
    clearTimeout(timer);
    const request = active; active = undefined;
    cancel(request);
  }};

  function finish(err, response, body) {
    if (stopped) return;
    stopped = true;
    active = undefined;
    clearTimeout(timer);
    callback(err, response, body);
  }

  function schedule(number) {
    const remaining = opts.totalTimeout * 1000 - (performance.now() - started);
    if (stopped || remaining <= 0) return false;
    const wait = delay(opts.maxRetryDelay, opts.retryDelayMultiplier, number, remaining);
    // Native timers turn delays > 2^31-1 into 1ms. Wait in bounded pieces.
    const due = performance.now() + wait;
    function wake() {
      if (stopped) return;
      const left = due - performance.now();
      if (left > MAX_TIMER) timer = setTimeout(wake, MAX_TIMER);
      else if (left > 1) timer = setTimeout(wake, left);
      else makeRequest();
    }
    timer = setTimeout(wake, Math.min(wait, MAX_TIMER));
    return true;
  }

  function makeRequest() {
    if (stopped) return;
    attempt++;
    let handled = false;
    function onResponse(err, response, body) {
      if (stopped || handled) return;
      handled = true;
      active = undefined;
      let retry;
      if (err) retry = ++noResponse <= opts.noResponseRetries;
      else {
        try { retry = (manualAttempt ? attempt : attempt - 1) < opts.retries && opts.shouldRetryFn(response); }
        catch (error) { finish(error); return; }
      }
      if (retry && schedule(err ? noResponse : attempt)) return;
      finish(err, response, body);
    }
    let request;
    try { request = opts.request(requestOpts, onResponse); }
    catch (error) {
      // Do not swallow exceptions thrown by the caller's callback.
      if (handled || stopped) { stopped = true; clearTimeout(timer); throw error; }
      onResponse(error);
      return;
    }
    if (aborted) cancel(request);
    else if (!handled && !stopped) active = request;
  }

  if (attempt > 0) {
    if (!schedule(attempt)) finish(timeoutError());
  } else makeRequest();
  return handle;
}

function streams(requestOpts, opts, manualAttempt) {
  const output = new PassThrough({objectMode: opts.objectMode});
  const started = performance.now();
  let attempt = opts.currentRetryAttempt, noResponse = 0, timer, active, stopped = false;
  const pendingEvents = new Set();
  const originalDestroy = output._destroy;
  output._destroy = function (error, done) {
    stopped = true;
    clearTimeout(timer);
    for (const event of pendingEvents) clearImmediate(event);
    pendingEvents.clear();
    try { dispose(true); } catch (cleanupError) { error ||= cleanupError; }
    originalDestroy.call(this, error, done);
  };
  output.abort = () => output.destroy();

  function dispose(cancelSource) {
    const state = active;
    if (!state) return;
    active = undefined;
    const {source, buffer, onError, onResponse, onFinish, onClose, onEnd} = state;
    source.unpipe(buffer);
    source.removeListener('error', onError);
    source.removeListener('response', onResponse);
    source.removeListener('complete', onFinish);
    source.removeListener('finish', onFinish);
    source.removeListener('close', onClose);
    source.removeListener('end', onEnd);
    // Some transports report cancellation asynchronously. This listener retains
    // no request state and prevents late errors from becoming uncaught errors.
    source.on('error', ignoreError);
    buffer.unpipe(output);
    buffer.destroy();
    if (cancelSource && !source.readableEnded) {
      // A transport may attach its body pipeline in another response listener.
      // Detach this attempt immediately, but let that event finish before teardown.
      queueMicrotask(() => {
        try { cancel(source); } catch (error) { if (!output.destroyed) output.destroy(error); }
      });
    }
  }

  function schedule(number) {
    const remaining = opts.totalTimeout * 1000 - (performance.now() - started);
    if (stopped || remaining <= 0) return false;
    const wait = delay(opts.maxRetryDelay, opts.retryDelayMultiplier, number, remaining);
    dispose(true);
    const due = performance.now() + wait;
    function wake() {
      if (stopped) return;
      const left = due - performance.now();
      if (left > MAX_TIMER) timer = setTimeout(wake, MAX_TIMER);
      else if (left > 1) timer = setTimeout(wake, left);
      else makeRequest();
    }
    timer = setTimeout(wake, Math.min(wait, MAX_TIMER));
    return true;
  }

  function makeRequest() {
    if (stopped) return;
    attempt++;
    let source;
    try {
      source = opts.request(requestOpts);
      if (!source || typeof source.on !== 'function' || typeof source.pipe !== 'function' || typeof source.unpipe !== 'function') {
        throw new TypeError('Streaming request must return a readable stream');
      }
    } catch (error) {
      if (++noResponse > opts.noResponseRetries || !schedule(noResponse)) output.destroy(error);
      return;
    }
    if (stopped) { cancel(source); return; }
    const buffer = new PassThrough({objectMode: opts.objectMode});
    const state = {source, buffer, handled: false, accepted: false, complete: false, finishArgs: undefined,
      onError, onResponse, onFinish, onClose, onEnd};
    active = state;
    const event = setImmediate(() => { pendingEvents.delete(event); if (!stopped) output.emit('request'); });
    pendingEvents.add(event);

    function onError(error) {
      if (stopped || active !== state) return;
      if (state.accepted) { output.destroy(error); return; }
      if (state.handled) return;
      state.handled = true;
      try {
        if (++noResponse <= opts.noResponseRetries && schedule(noResponse)) return;
      } catch (cleanupError) { output.destroy(cleanupError); return; }
      output.destroy(error);
    }

    function onResponse(response) {
      if (stopped || active !== state || state.handled) return;
      state.handled = true;
      let retry;
      try {
        retry = (manualAttempt ? attempt : attempt - 1) < opts.retries && opts.shouldRetryFn(response);
        if (stopped || active !== state) return;
        if (retry && schedule(attempt)) return;
      } catch (error) { output.destroy(error); return; }
      state.accepted = true;
      output.emit('response', response);
      if (stopped || active !== state) return;
      buffer.pipe(output);
      if (state.finishArgs) onFinish(...state.finishArgs);
    }

    function onFinish(...args) {
      if (stopped || active !== state || state.complete) return;
      if (!state.accepted) { state.finishArgs ||= args; return; }
      state.complete = true;
      output.emit('complete', ...args);
    }

    function onClose() {
      if (stopped || active !== state || source.readableEnded) return;
      const error = new Error('Request stream closed before its response completed');
      error.code = 'ERR_STREAM_PREMATURE_CLOSE';
      onError(error);
    }

    function onEnd() {
      if (state.handled || stopped || active !== state) return;
      const error = new Error('Request stream ended without a response');
      error.code = 'ERR_STREAM_PREMATURE_CLOSE';
      onError(error);
    }

    buffer.on('error', error => output.destroy(error));
    source.on('error', onError).on('response', onResponse)
      .on('complete', onFinish).on('finish', onFinish).on('close', onClose).on('end', onEnd);
    source.pipe(buffer);
  }

  if (attempt > 0) {
    if (!schedule(attempt)) output.destroy(timeoutError());
  } else makeRequest();
  return output;
}

module.exports = retryRequest;
module.exports.defaults = defaults;
module.exports.getNextRetryDelay = getNextRetryDelay;
