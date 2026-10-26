'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, 'fixtures/serve-static-2.2.1.cjs');
const fixture = { exports: {} };
// Same VPM primitives on both sides to isolate middleware behavior.
const dependencies = {
  encodeurl: require('vencodeurl'), 'escape-html': require('vescape-html'),
  parseurl: require('vparseurl'), send: require('vsend'),
  path: require('node:path'), url: require('node:url'),
};
vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
  if (!Object.hasOwn(dependencies, name)) throw new Error('Unexpected dependency: ' + name);
  return dependencies[name];
}, fixture, fixture.exports);
module.exports = fixture.exports;
