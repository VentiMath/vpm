'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Keep the pinned upstream source unchanged. Shared VPM primitives isolate
// handler behavior in differential tests; this is not a full upstream stack.
const filename = path.join(__dirname, 'fixtures/finalhandler-2.1.1.cjs');
const dependencies = {
  debug: require('vdebug'),
  encodeurl: require('vencodeurl'),
  'escape-html': require('vescape-html'),
  'on-finished': require('von-finished'),
  parseurl: require('vparseurl'),
  statuses: require('vstatuses'),
};
const fixture = { exports: {} };
vm.compileFunction(fs.readFileSync(filename, 'utf8'), ['require', 'module', 'exports'], { filename })(name => {
  if (!Object.hasOwn(dependencies, name)) throw new Error('Unexpected fixture dependency: ' + name);
  return dependencies[name];
}, fixture, fixture.exports);
module.exports = fixture.exports;
