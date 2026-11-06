'use strict';
const fs = require('node:fs'), {createRequire} = require('node:module');
// Execute unchanged pinned CommonJS caller bytes with one explicit import seam.
// Do not patch global resolution or share a caller module between variants.
module.exports = function model(name, OrderedMap) {
  const entry = require.resolve(name), selected = createRequire(entry), caller = {exports: {}};
  const load = name => name === 'orderedmap' ? OrderedMap : selected(name);
  new Function('require', 'module', 'exports', fs.readFileSync(entry, 'utf8'))(load, caller, caller.exports);
  return caller.exports;
};
