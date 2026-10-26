'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const fixture = { exports: {} };
const file = path.join(__dirname, 'fixtures/http-errors-2.0.1.cjs');
// Upstream's modern-runtime branches, with warning output disabled. The source
// fixture is unchanged; actual installed upstream stacks are used in integration.
const dependencies = {
  depd: () => () => {},
  inherits: require('node:util').inherits,
  setprototypeof: Object.setPrototypeOf,
  statuses: require('../../vstatuses/test/fixtures/statuses-2.0.2'),
  toidentifier: value => value.split(' ').map(word => word.slice(0, 1).toUpperCase() + word.slice(1)).join('').replace(/[^ _0-9a-z]/gi, ''),
};
vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
  if (!Object.hasOwn(dependencies, name)) throw new Error('Unexpected dependency: ' + name);
  return dependencies[name];
}, fixture, fixture.exports);
module.exports = fixture.exports;
