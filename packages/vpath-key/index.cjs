"use strict";
// Environment names are ASCII; inspect key names only, never environment values.
function pathKey({ env = process.env, platform = process.platform } = {}) {
  if (platform !== 'win32') return 'PATH';
  const keys = Object.keys(env);
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i];
    if (key.length === 4 && (key.charCodeAt(0) | 32) === 112 &&
        (key.charCodeAt(1) | 32) === 97 && (key.charCodeAt(2) | 32) === 116 &&
        (key.charCodeAt(3) | 32) === 104) return key;
  }
  return 'Path';
}
module.exports = pathKey;
module.exports.default = pathKey;
