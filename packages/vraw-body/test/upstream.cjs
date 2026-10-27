'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, 'fixtures/raw-body-3.0.2.cjs');
const fixture = { exports: {} };
// Immutable raw-body 3.0.2 and unpipe 1.0.0 sources. Reuse the repository's
// pinned upstream dependencies; no VPM implementation enters this baseline.
const dependencies = {
  async_hooks: require('node:async_hooks'),
  bytes: require('../../vbytes/test/fixtures/bytes-3.1.2.cjs'),
  'http-errors': require('../../vhttp-errors/test/upstream.cjs'),
  'iconv-lite': require('../../viconv-lite/test/upstream.cjs'),
  unpipe: require('./fixtures/unpipe-1.0.0.cjs'),
};
vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
  if (!Object.hasOwn(dependencies, name)) throw new Error('Unexpected dependency: ' + name);
  return dependencies[name];
}, fixture, fixture.exports);
module.exports = fixture.exports;
