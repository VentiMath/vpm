'use strict';
const {snapshotOptions} = require('../app/options-snapshot');

// Short JSON records need no graph bookkeeping. Bound recursive depth, then
// use the iterative walker for deep values and cycle diagnostics.
function snapshotJson(value, cycleMessage, depth = 0) {
    if (value === null || typeof value !== 'object') return value;
    if (depth === 32) return snapshotOptions(value, cycleMessage);
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Date.prototype) return new Date(value.getTime());
    const array = Array.isArray(value);
    if (!array && prototype !== Object.prototype && prototype !== null) return value;
    const result = array ? new Array(value.length) : Object.create(prototype);
    for (const key of Object.keys(value)) {
        const copied = snapshotJson(value[key], cycleMessage, depth + 1);
        if (key in result) Object.defineProperty(result, key, {value: copied, writable: true, enumerable: true, configurable: true});
        else result[key] = copied;
    }
    return result;
}
exports.snapshotJson = snapshotJson;
