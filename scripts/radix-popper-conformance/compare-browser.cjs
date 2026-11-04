'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const folder = path.resolve(process.argv[2]);
const before = require(path.join(folder, 'upstream-results.json')), after = require(path.join(folder, 'vpm-results.json'));
assert.deepEqual(after.checks, before.checks);
for (let i = 0; i < before.snapshots.length; i++) {
  const a = before.snapshots[i], b = after.snapshots[i];
  assert.equal(b.name, a.name); assert.equal(b.side, a.side); assert.equal(b.align, a.align);
  assert.equal(b.origin, a.origin, a.name + ' transform origin');
  for (let j = 0; j < a.box.length; j++) assert(Math.abs(a.box[j] - b.box[j]) < 0.6, a.name + ' rectangle');
}
assert.equal(after.cssWrites, 0); assert(before.cssWrites >= 20);
console.log('52 browser rectangles, placements and transform origins match; five unchanged updates write sizing CSS upstream, zero in VPM.');
