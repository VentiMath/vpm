'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('app lifecycle regressions and original controls', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/app-lifecycle.cjs')], {encoding: 'utf8', timeout: 90000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
