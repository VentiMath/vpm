"use strict";
// Keep this check local; it does not require a process shim in browser bundles.
exports.env = {
  isNode:
    typeof process !== "undefined" &&
    Object.prototype.toString.call(process) === "[object process]",
  forceCache: false,
};
