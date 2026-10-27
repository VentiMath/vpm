'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { isBuiltin } = require('node:module');
const root = path.join(__dirname, 'fixtures/body-parser-2.4.0');
const cache = new Map();
// Isolate middleware decisions using identical VPM primitives on both sides.
// The HTTP benchmark separately loads the full, locked upstream dependency tree.
const dependencies = Object.fromEntries(['bytes', 'content-type', 'debug', 'http-errors', 'iconv-lite', 'on-finished', 'qs', 'raw-body', 'type-is'].map(name => [name, require(name === 'on-finished' ? 'von-finished' : 'v' + name)]));
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
    if (isBuiltin(name)) return require(name);
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name.startsWith('./') || name.startsWith('../')) return load(path.resolve(path.dirname(file), name + '.js'));
    throw new Error('Unexpected dependency: ' + name);
  }, module, module.exports);
  return module.exports;
}
module.exports = load(path.join(root, 'index.js'));
