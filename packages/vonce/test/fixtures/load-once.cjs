'use strict';
// Evaluate the unmodified baseline in this realm with its pinned dependency.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, 'once-1.4.0.cjs');
const instance = { exports: {} };
const run = vm.runInThisContext('(function(exports, require, module, __filename, __dirname) {\n' + fs.readFileSync(file, 'utf8') + '\n})', { filename: file });
run(instance.exports, name => {
  if (name === 'wrappy') return require('./wrappy-1.0.2.cjs');
  throw new Error('Unexpected baseline dependency: ' + name);
}, instance, file, __dirname);
module.exports = instance.exports;
