'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
// Inject fixtures' dependencies without changing their verified source files.
module.exports = function load(file, dependencies, globals = {}) {
  const module = { exports: {} };
  const names = ['performance', 'Date', 'process', 'console', 'localStorage', 'window', 'navigator', 'document'];
  const defaults = { performance, Date, process, console };
  const evaluate = vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports', ...names], { filename: path.resolve(file) });
  evaluate(name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name.startsWith('node:') || name === 'tty' || name === 'util') return require(name);
    throw new Error('Unexpected dependency: ' + name);
  }, module, module.exports, ...names.map(name => Object.hasOwn(globals, name) ? globals[name] : defaults[name]));
  return module.exports;
};
