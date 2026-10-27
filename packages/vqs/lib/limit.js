'use strict';

// Limits control parsing work. Reject invalid configuration instead of silently
// disabling a bound or allowing String#split's uint32 conversion to change it.
module.exports = function numericLimit(value, fallback, name) {
    if (value === undefined) return fallback;
    if (value === Infinity || (Number.isSafeInteger(value) && value >= 0)) return value;
    throw new TypeError(name + ' must be a non-negative safe integer or Infinity');
};
