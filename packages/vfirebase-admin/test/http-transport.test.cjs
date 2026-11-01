'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process'), path = require('node:path');
test('Admin HTTP owns retry bytes and settles response failures', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/http-transport.cjs')], {encoding: 'utf8', timeout: 150000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
