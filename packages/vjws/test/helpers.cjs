'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const jwa = require('../../vjwa/test/helpers.cjs');
const directory = path.join(__dirname, 'fixtures/upstream');
function upstreamUsing(implementation) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} }, native = createRequire(file);
    cache.set(file, module.exports);
    new Function('require', 'module', 'exports', fs.readFileSync(file, 'utf8'))(name => {
      if (name === 'jwa') return implementation;
      if (name === 'safe-buffer') return jwa.upstreamModule(name);
      if (name.startsWith('.')) return load(require.resolve(path.resolve(path.dirname(file), name)));
      return native(name);
    }, module, module.exports);
    cache.set(file, module.exports);
    return module.exports;
  }
  return load(path.join(directory, 'index.js'));
}
module.exports = { upstream: upstreamUsing(jwa.upstream), bridged: upstreamUsing(require('../../vjwa')),
  keys: jwa.keys, upstreamUsing };
