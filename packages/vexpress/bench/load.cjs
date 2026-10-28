'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const fixture = createRequire(path.resolve(__dirname, '../../../scripts/express-conformance/package.json'));
const directory = path.dirname(fixture.resolve('express/package.json'));
const mapping = require('../PROVENANCE.json').dependencies;
// One isolated CommonJS cache per implementation, identical source compilation
// and explicit imports. Only the direct dependency map changes in the control.
module.exports = function load(vpm = false) {
  const cache = new Map();
  function evaluate(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const from = createRequire(file);
    new Function('exports', 'require', 'module', '__filename', '__dirname', fs.readFileSync(file, 'utf8'))
      .call(mod.exports, mod.exports, name => {
        if (name.startsWith('.')) return evaluate(from.resolve(name));
        if (vpm && Object.hasOwn(mapping, name)) return require(path.resolve(__dirname, '../../', mapping[name]));
        return from(name);
      }, mod, file, path.dirname(file));
    return mod.exports;
  }
  return evaluate(path.join(directory, 'index.js'));
};
