'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.join(__dirname, 'node_modules/firebase-admin');
const from = createRequire(path.join(root, 'package.json'));
assert.equal(require(path.join(root, 'package.json')).version, '14.5.0');
assert.equal(from('jwks-rsa/package.json').version, '4.1.0');

// Load the real SDK modules with only their JWKS import replaced. Restore the
// module cache immediately; the returned classes retain the selected import.
function load(target, observe) {
  const entry = from.resolve('jwks-rsa');
  from('jwks-rsa');
  const original = require.cache[entry].exports;
  const files = ['utils/jwt.js', 'app-check/token-verifier.js'].map(file => path.join(root, 'lib', file));
  const saved = files.map(file => require.cache[file]);
  try {
    require.cache[entry].exports = observe ? options => {
      const client = target(options);
      observe.clients.push(client);
      const get = client.getSigningKeys.bind(client);
      client.getSigningKeys = (...args) => { observe.calls++; return get(...args); };
      return client;
    } : target;
    for (const file of files) delete require.cache[file];
    return { ...require(files[0]), ...require(files[1]) };
  } finally {
    require.cache[entry].exports = original;
    for (let i = 0; i < files.length; i++) {
      if (saved[i]) require.cache[files[i]] = saved[i]; else delete require.cache[files[i]];
    }
  }
}
module.exports = { load };
