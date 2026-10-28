'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const { test } = require('node:test');
const parse = require('..');
// Tape registration/assertion adapter. Original test source and assertions stay
// unchanged. These synchronous tests use equal, deepEqual/same, plan and end.
for (const file of fs.readdirSync(path.join(__dirname, 'fixtures/upstream')).sort()) {
  const source = fs.readFileSync(path.join(__dirname, 'fixtures/upstream', file), 'utf8');
  new Function('require', source)(name => {
    if (name === '../') return parse;
    if (name !== 'tape') return require(name);
    return (name, fn) => test(file + ': ' + name, () => {
      let count = 0, planned, ended = false;
      function check(fn, ...args) { assert.equal(ended, false, 'assertion after end'); count++; fn(...args); }
      fn({
        equal: (...args) => check(assert.strictEqual, ...args),
        deepEqual: (...args) => check(assert.deepEqual, ...args),
        same: (...args) => check(assert.deepEqual, ...args),
        plan(value) { assert.equal(planned, undefined); planned = value; },
        end() { assert.equal(ended, false, 'duplicate end'); ended = true; }
      });
      if (planned !== undefined) assert.strictEqual(count, planned, 'assertion plan');
      else assert.equal(ended, true, 'test must end');
    });
  });
}
