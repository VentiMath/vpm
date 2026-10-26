'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const fixture = { exports: {} };
const file = path.join(__dirname, 'fixtures/mime-types-3.0.2/index.js');
// Unchanged upstream implementation and scoring, with its exact data snapshot.
// Parse separately so mutation tests cannot affect VPM or the source fixture.
const dependencies = {
  'mime-db': JSON.parse(fs.readFileSync(path.join(__dirname, '../../vmime-db/db.json'), 'utf8')),
  path: require('node:path'),
  './mimeScore': require('./fixtures/mime-types-3.0.2/mimeScore'),
};
vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
  if (!Object.hasOwn(dependencies, name)) throw new Error('Unexpected dependency: ' + name);
  return dependencies[name];
}, fixture, fixture.exports);
module.exports = fixture.exports;
