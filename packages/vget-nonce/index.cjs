'use strict';
let configured;
exports.setNonce = function setNonce(value) { configured = value; };
exports.getNonce = function getNonce() {
  if (configured) return configured;
  // Keep the lexical identifier: webpack replaces it with its runtime nonce.
  return typeof __webpack_nonce__ === 'undefined' ? undefined : __webpack_nonce__;
};
