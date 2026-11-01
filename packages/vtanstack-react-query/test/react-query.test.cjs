'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('mounted React application scenarios pass through the VPM hooks', () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/tanstack-query-conformance/application.cjs')], {encoding: 'utf8', timeout: 30000});
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /application scenarios passed/);
});
