'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { describe, test } = require('node:test');
// Run the unmodified upstream suite on the same built-in runners as VPM.
// Only the Mocha registration API and the import of cors are adapted.
const source = fs.readFileSync(path.join(__dirname, 'fixtures/upstream-tests.cjs'), 'utf8');
new Function('require', 'describe', 'it', source)(name => {
  if (name === '..') return require('..');
  if (name === 'after') return require('./fixtures/after-0.8.2.cjs');
  return require(name);
}, describe, (name, fn) => test(name, fn.length ? (_context, done) => fn(done) : fn));
