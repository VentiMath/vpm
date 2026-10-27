'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, 'fixtures/accepts-2.0.0/index.js');
const moduleFixture = { exports: {} };
const dependencies = {
  negotiator: require('../../vnegotiator/test/upstream.cjs'),
  'mime-types': require('../../vmime-types/test/upstream.cjs'),
};
vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
  if (!Object.hasOwn(dependencies, name)) throw new Error('Unexpected dependency: ' + name);
  return dependencies[name];
}, moduleFixture, moduleFixture.exports);
module.exports = moduleFixture.exports;
