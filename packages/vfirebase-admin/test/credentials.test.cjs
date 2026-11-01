'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process'), path = require('node:path');
test('credential adapter regressions and original controls', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/credentials.cjs')], {encoding: 'utf8', timeout: 90000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
test('credential OAuth requests use their configured HTTP agent', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/credential-transport.cjs')], {encoding: 'utf8', timeout: 90000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
