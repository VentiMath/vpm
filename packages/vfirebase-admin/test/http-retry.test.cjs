'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('owned HTTP retry policy fixes the reproduced upstream boundary failures', () => {
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/http-retry.cjs')], {encoding: 'utf8', timeout: 60000});
    assert.equal(result.status, 0, result.stderr || result.stdout);
});
