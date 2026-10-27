'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const contentType = require('../../vcontent-type/test/fixtures/content-type-2.1.0.cjs');
const directory = path.join(__dirname, 'fixtures/negotiator-1.1.0');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
    if (name === 'content-type') return contentType;
    if (!name.startsWith('./')) throw new Error('Unexpected dependency: ' + name);
    return load(path.resolve(path.dirname(file), name + '.js'));
  }, module, module.exports);
  return module.exports;
}
module.exports = load(path.join(directory, 'index.js'));
