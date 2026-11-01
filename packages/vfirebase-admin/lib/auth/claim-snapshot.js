"use strict";
const {snapshotOptions} = require('../app/options-snapshot');

// Most claims are a short JSON record. Avoid graph bookkeeping on that path;
// cap the recursive walk, then use the iterative graph walker for deep values
// or cycles. No path can recurse beyond this fixed bound.
function detachClaims(value, depth = 0) {
  if (value === null || typeof value !== 'object') return value;
  if (depth === 32) return snapshotOptions(value, 'User record data must not contain cycles.');
  const proto = Object.getPrototypeOf(value);
  if (proto === Date.prototype) return new Date(value.getTime());
  const array = Array.isArray(value);
  if (!array && proto !== Object.prototype && proto !== null) return value;
  const result = array ? new Array(value.length) : Object.create(proto);
  for (const key of Object.keys(value)) {
    const copied = detachClaims(value[key], depth + 1);
    if (key in result) Object.defineProperty(result, key, {value: copied, writable: true, enumerable: true, configurable: true});
    else result[key] = copied;
  }
  return result;
}
exports.detachClaims = detachClaims;
