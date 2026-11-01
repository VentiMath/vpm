'use strict';
const {RESET_VALUE, ResetValue} = require('../common/options.js');
const {Expression} = require('../params/types.js');

// These are fields of the Firebase deployment protocol, not a runtime SDK.
const endpointFields = ['availableMemoryMb', 'timeoutSeconds', 'minInstances', 'maxInstances', 'ingressSettings', 'concurrency', 'serviceAccountEmail', 'vpc'];
const retries = ['maxAttempts', 'maxDoublings', 'maxBackoffSeconds', 'maxRetrySeconds', 'minBackoffSeconds'];
const rates = ['maxConcurrentDispatches', 'maxDispatchesPerSecond'];
const scheduledV1 = ['retryCount', 'maxDoublings', 'maxRetryDuration', 'maxBackoffDuration', 'minBackoffDuration'];
const scheduledV2 = ['retryCount', 'maxDoublings', 'maxRetrySeconds', 'minBackoffSeconds', 'maxBackoffSeconds'];
const manifestKey = Symbol.for('firebase-functions:manifest');
const globalManifest = globalThis[manifestKey] ??= {};
const preserve = options => options.some(option => option?.preserveExternalChanges);
function resetFields(fields, options) {
  const result = {};
  if (!preserve(options)) for (const field of fields) result[field] = RESET_VALUE;
  return result;
}
function schedule(version, expression, options) {
  const value = {schedule: expression, retryConfig: resetFields(version === 1 ? scheduledV1 : scheduledV2, options)};
  if (!preserve(options)) value.timeZone = RESET_VALUE;
  return value;
}

function stackToWire(stack) {
  // Copy rather than modifying exported endpoint definitions. The CLI can
  // inspect frozen declarations and repeat discovery without destroying CEL
  // expressions used by a later caller. An explicit worklist avoids recursion
  // on deeply nested labels/options, and preserves shared object identity.
  const copies = new WeakMap(), work = [];
  function value(input) {
    if (input instanceof Expression) return input.toCEL();
    if (input instanceof ResetValue) return null;
    if (input === null || typeof input !== 'object' || input instanceof Date) return input;
    if (copies.has(input)) return copies.get(input);
    const output = Array.isArray(input) ? new Array(input.length) : {};
    copies.set(input, output);
    work.push([input, output]);
    return output;
  }
  const endpoints = value(stack.endpoints);
  while (work.length) {
    const [input, output] = work.pop();
    for (const key of Object.keys(input)) {
      const converted = value(input[key]);
      if (key === '__proto__') Object.defineProperty(output, key, {value: converted, enumerable: true, configurable: true, writable: true});
      else output[key] = converted;
    }
  }
  return {...stack, endpoints};
}

exports.globalManifest = globalManifest;
exports.clearGlobalManifest = () => {for (const key of Object.keys(globalManifest)) delete globalManifest[key];};
exports.initV1Endpoint = (...options) => resetFields(endpointFields.filter(field => field !== 'concurrency'), options);
exports.initV2Endpoint = (...options) => resetFields(endpointFields, options);
exports.initTaskQueueTrigger = (...options) => ({retryConfig: resetFields(retries, options), rateLimits: resetFields(rates, options)});
exports.initV1ScheduleTrigger = (expression, ...options) => schedule(1, expression, options);
exports.initV2ScheduleTrigger = (expression, ...options) => schedule(2, expression, options);
exports.stackToWire = stackToWire;
