'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process'), path = require('node:path');
test('Auth requests own input data and encode resource identity through HTTP dispatch', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/auth-requests.cjs')], {encoding: 'utf8', timeout: 150000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
