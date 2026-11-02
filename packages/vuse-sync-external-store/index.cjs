'use strict';
// On the supported React 19 baseline the native hook owns subscription,
// hydration and concurrent-render consistency. No legacy React shim is needed.
exports.useSyncExternalStore = require('react').useSyncExternalStore;
