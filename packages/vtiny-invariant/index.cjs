'use strict';

// Select the failure policy once. Bundlers can replace NODE_ENV and discard the
// unused branch, including all diagnostic-message handling in production.
module.exports = process.env.NODE_ENV === 'production'
  ? function invariant(condition, message) {
    if (!condition) throw new Error('Invariant failed');
  }
  : function invariant(condition, message) {
    if (condition) return;
    if (typeof message === 'function') message = message();
    throw new Error(message ? `Invariant failed: ${message}` : 'Invariant failed');
  };
