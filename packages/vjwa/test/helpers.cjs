'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const directory = path.join(__dirname, 'fixtures/upstream');
const names = {
  jwa: 'jwa/index.js', 'safe-buffer': 'safe-buffer/index.js',
  'buffer-equal-constant-time': 'buffer-equal-constant-time/index.js',
  'ecdsa-sig-formatter': 'ecdsa-sig-formatter/src/ecdsa-sig-formatter.js',
};
const cache = new Map();
// Evaluate unmodified, pinned upstream modules with fixture-only dependency
// resolution. No process-wide loader or installed package is modified.
function upstreamModule(name) {
  const file = path.join(directory, names[name]);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const native = createRequire(file);
  new Function('require', 'module', 'exports', fs.readFileSync(file, 'utf8'))(
    name => Object.hasOwn(names, name) ? upstreamModule(name) : native(name), module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
const keys = {};
for (const [name, jwk] of Object.entries(require('./fixtures/keys.json'))) {
  const privateKey = crypto.createPrivateKey({ key: jwk, format: 'jwk' });
  const publicKey = crypto.createPublicKey(privateKey);
  keys[name] = { privateKey, publicKey,
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }) };
}
module.exports = { upstream: upstreamModule('jwa'), upstreamModule, keys };
