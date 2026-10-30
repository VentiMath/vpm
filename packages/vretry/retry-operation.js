'use strict';
const MAX_TIMER = 2147483647;
const now = () => performance.now();
function copyTimeouts(timeouts) {
  if (!Array.isArray(timeouts)) throw new TypeError('timeouts must be an array');
  const result = timeouts.slice();
  for (const delay of result) if (typeof delay !== 'number' || !Number.isFinite(delay) || delay < 0 || delay > Number.MAX_SAFE_INTEGER) throw new RangeError('timeouts must contain finite, nonnegative, safely representable delays');
  return result;
}
class RetryOperation {
  constructor(timeouts, options = {}) {
    if (typeof options === 'boolean') options = {forever:options};
    if (options === null || typeof options !== 'object') throw new TypeError('options must be an object');
    this._originalTimeouts = copyTimeouts(timeouts);
    this._options = {forever:options.forever ?? false,unref:options.unref ?? false};
    if (typeof this._options.forever !== 'boolean' || typeof this._options.unref !== 'boolean') throw new TypeError('forever and unref must be booleans');
    this._maxRetryTime = options.maxRetryTime ?? Infinity;
    if (typeof this._maxRetryTime !== 'number' || this._maxRetryTime < 0 || Number.isNaN(this._maxRetryTime)) throw new RangeError('maxRetryTime must be nonnegative');
    this._errors = [];
    this._generation = 0;
    this._timer = this._timeout = null;
    this.reset();
  }
  _clearTimers() {
    if (this._timer !== null) clearTimeout(this._timer);
    if (this._timeout !== null) clearTimeout(this._timeout);
    this._timer = this._timeout = null;
    this._generation++;
  }
  reset() {
    this._clearTimers();
    this._attempts = 1;
    this._index = 0;
    this._errors.length = 0;
    this._stopped = false;
    this._fn = null;
    this._operationStart = null;
    this._operationTimeout = null;
    this._operationTimeoutCb = null;
  }
  stop() { this._clearTimers(); this._stopped = true; }
  _schedule(delay, slot, callback) {
    const generation = this._generation;
    const fire = () => {
      if (this._stopped || generation !== this._generation) return;
      this[slot] = null;
      callback();
    };
    if (delay <= MAX_TIMER) {
      this[slot] = setTimeout(fire,delay);
    } else {
      const deadline = now() + delay;
      const arm = () => {
        if (this._stopped || generation !== this._generation) return;
        const remaining = deadline - now();
        if (remaining <= 0) { fire(); return; }
        this[slot] = setTimeout(arm,Math.min(MAX_TIMER,Math.ceil(remaining)));
        if (this._options.unref) this[slot].unref?.();
      };
      arm();
    }
    if (this._options.unref) this[slot]?.unref?.();
  }
  _watchAttempt(first) {
    if (this._operationTimeoutCb) this._schedule(this._operationTimeout, '_timeout', () => first ? this._operationTimeoutCb() : this._operationTimeoutCb(this._attempts));
  }
  attempt(fn, timeoutOptions) {
    if (typeof fn !== 'function') throw new TypeError('attempt must be a function');
    if (this._stopped) return;
    let delay = null, callback = null;
    if (timeoutOptions != null) {
      delay = timeoutOptions.timeout ?? 0;
      if (typeof delay !== 'number' || !Number.isFinite(delay) || delay < 0 || delay > Number.MAX_SAFE_INTEGER) throw new RangeError('attempt timeout must be a finite nonnegative delay');
      callback = timeoutOptions.cb ?? null;
      if (callback !== null && typeof callback !== 'function') throw new TypeError('timeout callback must be a function');
    }
    this._clearTimers();
    this._fn = fn;
    this._operationStart = now();
    this._operationTimeout = delay;
    this._operationTimeoutCb = callback;
    this._watchAttempt(true);
    try { fn(this._attempts); } catch (error) { this.stop(); throw error; }
  }
  retry(error) {
    if (this._stopped) return false;
    if (!error) { this.stop(); return false; }
    if (this._timer !== null) return true;
    if (typeof this._fn !== 'function') throw new TypeError('call attempt before retry');
    if (this._timeout !== null) { clearTimeout(this._timeout); this._timeout = null; }
    if (this._options.forever) this._errors.length = 0;
    this._errors.push(error);
    const timeouts = this._originalTimeouts;
    let delay = timeouts[this._index];
    if (delay === undefined && this._options.forever) delay = timeouts[timeouts.length - 1] ?? 1;
    if (delay === undefined) { this.stop(); return false; }
    const remaining = this._maxRetryTime - (now() - this._operationStart);
    if (remaining <= 0 || delay >= remaining) {
      this._errors.unshift(Object.assign(new Error('RetryOperation timeout occurred'),{code:'ERR_RETRY_TIMEOUT'}));
      this.stop(); return false;
    }
    this._index++;
    this._schedule(delay, '_timer', () => {
      this._attempts++;
      this._watchAttempt(false);
      try { this._fn(this._attempts); } catch (error) { this.stop(); throw error; }
    });
    return true;
  }
  errors() { return this._errors; }
  attempts() { return this._attempts; }
  mainError() {
    if (this._errors.length < 2) return this._errors[0] ?? null;
    const counts = Object.create(null); let other, best = null, highest = 0;
    for (const error of this._errors) {
      const key = error?.message ?? error;
      let count;
      if (typeof key === 'string') count = counts[key] = (counts[key] || 0) + 1;
      else { other ||= new Map(); count = (other.get(key) || 0) + 1; other.set(key,count); }
      if (count >= highest) { best = error; highest = count; }
    }
    return best;
  }
  try(fn, timeoutOptions) { return this.attempt(fn,timeoutOptions); }
  start(fn, timeoutOptions) { return this.attempt(fn,timeoutOptions); }
}
RetryOperation.copyTimeouts = copyTimeouts;
module.exports = RetryOperation;
