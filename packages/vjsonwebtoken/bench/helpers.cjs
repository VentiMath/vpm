'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const directory = path.resolve(__dirname, '../../../scripts/consumers/node_modules/jsonwebtoken');
assert.equal(require(path.join(directory, 'package.json')).version, '9.0.3');
const upstream = require(directory);
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} }, native = createRequire(file);
  cache.set(file, module.exports);
  new Function('require', 'module', 'exports', fs.readFileSync(file, 'utf8'))(name => {
    if (name === 'jws') return require('../../vjws');
    if (name === 'ms') return require('../../vms');
    if (name.startsWith('.')) return load(require.resolve(path.resolve(path.dirname(file), name)));
    return native(name);
  }, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
module.exports = { upstream, bridged: load(path.join(directory, 'index.js')), keys: require('../../vjwa/test/helpers.cjs').keys };
