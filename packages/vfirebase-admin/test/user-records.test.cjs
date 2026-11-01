'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process'), path = require('node:path');
test('Auth records preserve caller fields and detach serialized claims safely', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/user-records.cjs')], {encoding: 'utf8', timeout: 90000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
