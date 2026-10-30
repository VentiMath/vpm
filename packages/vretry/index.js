'use strict';
const RetryOperation = require('./retry-operation');
function own(object, key, fallback) {
  if (!object || !Object.hasOwn(object,key)) return fallback;
  const value = object[key];
  return value === undefined ? fallback : value;
}

function number(value, name, infinity = false) {
  if (typeof value !== 'number' || value < 0 || (!Number.isFinite(value) && !(infinity && value === Infinity))) {
    throw new TypeError(`${name} must be a nonnegative number${infinity ? ' or Infinity' : ''}`);
  }
  return value;
}
function settings(options) {
  if (options != null && (typeof options !== 'object' || Array.isArray(options))) throw new TypeError('options must be an object');
  let retries = own(options, 'retries', 10);
  if (retries === null) retries = 0;
  if (retries !== Infinity && (!Number.isSafeInteger(retries) || retries < 0 || retries > 100000)) throw new RangeError('retries must be an integer from 0 to 100000, or Infinity');
  const factor = number(own(options, 'factor', 2), 'factor');
  if (factor === 0) throw new RangeError('factor must be greater than zero');
  const minTimeout = number(own(options, 'minTimeout', 1000), 'minTimeout');
  const maxTimeout = number(own(options, 'maxTimeout', Infinity), 'maxTimeout', true);
  if (minTimeout > maxTimeout) throw new RangeError('minTimeout is greater than maxTimeout');
  const randomize = own(options, 'randomize', false), forever = own(options, 'forever', false), unref = own(options, 'unref', false);
  if (typeof randomize !== 'boolean' || typeof forever !== 'boolean' || typeof unref !== 'boolean') throw new TypeError('randomize, forever and unref must be booleans');
  return {retries, factor, minTimeout, maxTimeout, randomize, forever:forever || retries === Infinity, unref, maxRetryTime:number(own(options,'maxRetryTime',Infinity),'maxRetryTime',true)};
}
function calculate(attempt, options) {
  const random = options.randomize ? 1 + Math.random() : 1;
  const delay = Math.min(Math.round(random * Math.max(options.minTimeout, 1) * Math.pow(options.factor, attempt)), options.maxTimeout);
  if (!Number.isFinite(delay) || delay > Number.MAX_SAFE_INTEGER) throw new RangeError('retry delay exceeds the safe timer range');
  return delay;
}
function schedule(options) {
  // Infinity selects a finite initial ramp, then repeats its final delay.
  const count = options.retries === Infinity ? 10 : options.retries;
  const length = count || (options.forever ? 1 : 0), result = new Array(length);
  for (let i = 0; i < length; i++) result[i] = calculate(i, options);
  if (options.factor < 1 || options.randomize) result.sort((a,b)=>a-b);
  return result;
}
function timeouts(options) {
  if (Array.isArray(options)) return RetryOperation.copyTimeouts(options);
  return schedule(settings(options));
}
function operation(options) {
  if (Array.isArray(options)) return new RetryOperation(options);
  const config = settings(options);
  return new RetryOperation(schedule(config), config);
}
function createTimeout(attempt, options) {
  if (!Number.isSafeInteger(attempt) || attempt < 0) throw new RangeError('attempt must be a nonnegative integer');
  return calculate(attempt, settings(options));
}
function wrap(object, options, methods) {
  if (object === null || !['object','function'].includes(typeof object)) throw new TypeError('object must contain callback methods');
  if (Array.isArray(options)) { methods = options; options = undefined; }
  const config = settings(options);
  if (methods !== undefined && !Array.isArray(methods)) throw new TypeError('methods must be an array');
  const names = methods || Object.keys(object).filter(key => typeof Object.getOwnPropertyDescriptor(object,key)?.value === 'function');
  const prepared = [];
  for (const name of new Set(names)) {
    if (typeof name !== 'string' && typeof name !== 'symbol') throw new TypeError('method names must be strings or symbols');
    let owner = object, descriptor;
    while (owner && !(descriptor = Object.getOwnPropertyDescriptor(owner,name))) owner = Object.getPrototypeOf(owner);
    if (typeof descriptor?.value !== 'function') throw new TypeError('method must be a data function');
    const ownDescriptor = Object.getOwnPropertyDescriptor(object,name);
    if ((ownDescriptor && !ownDescriptor.configurable && !ownDescriptor.writable) || (!ownDescriptor && !Object.isExtensible(object))) throw new TypeError('method cannot be replaced');
    prepared.push({name, original:descriptor.value, descriptor:ownDescriptor});
  }
  const snapshot = Object.freeze({...config});
  for (const {name, original, descriptor} of prepared) {
    function retryWrapper(...args) {
      const callback = args.pop();
      if (typeof callback !== 'function') throw new TypeError('last argument must be a callback');
      const op = operation(snapshot); let settled = false;
      op.attempt(() => {
        let called = false;
        const done = function(...results) {
          const error = results[0];
          if (called || settled) return;
          called = true;
          if (error && op.retry(error)) return;
          settled = true; op.stop();
          if (error) results[0] = op.mainError();
          callback.apply(this, results);
        };
        // Keep synchronous method and callback exceptions synchronous.
        try { original.call(object, ...args, done); } catch (error) { op.stop(); settled = true; throw error; }
      });
    }
    const fn = retryWrapper.bind(object);
    Object.defineProperty(fn,'name',{value:'bound retryWrapper',configurable:true});
    fn.options = snapshot;
    Object.defineProperty(object,name,descriptor ? {...descriptor,value:fn} : {value:fn,enumerable:true,writable:true,configurable:true});
  }
}
exports.operation = operation;
exports.timeouts = timeouts;
exports.createTimeout = createTimeout;
exports.wrap = wrap;
exports.RetryOperation = RetryOperation;
