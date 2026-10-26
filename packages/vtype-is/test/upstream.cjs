'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, 'fixtures/type-is-2.1.0.cjs');
const fixture = { exports: {} };
// Byte-for-byte upstream sources, including its three dependencies, use only
// committed fixtures. Unit tests do not need the consumer fixture installed.
const dependencies = {
  'content-type': require('../../vcontent-type/test/fixtures/content-type-2.1.0.cjs'),
  'media-typer': require('../../vmedia-typer/test/fixtures/media-typer-1.1.1.cjs'),
  'mime-types': require('../../vmime-types/test/upstream.cjs'),
};
vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
  if (!Object.hasOwn(dependencies, name)) throw new Error('Unexpected dependency: ' + name);
  return dependencies[name];
}, fixture, fixture.exports);
module.exports = fixture.exports;
