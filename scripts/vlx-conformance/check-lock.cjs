'use strict';
const assert = require('node:assert/strict');
const lock = require('./package-lock.json');
const native = lock.packages['node_modules/@resvg/resvg-js'];
for (const [name, version] of Object.entries(native.optionalDependencies)) {
  const entry = lock.packages['node_modules/' + name];
  assert.ok(entry, 'Missing native platform package in lockfile: ' + name);
  assert.equal(entry.version, version, name);
  assert.ok(entry.integrity, name + ' must have a recorded integrity');
}
console.log('Every resvg platform artifact is present in the locked fixture.');
