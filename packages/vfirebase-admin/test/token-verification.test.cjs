'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process'), path = require('node:path');
test('Auth token policy and revocation retain valid results and reject malformed claims', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/token-verification.cjs')], {encoding: 'utf8', timeout: 150000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
