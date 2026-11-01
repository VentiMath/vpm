'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('authorization captures headers and prevents credential casing overrides', () => {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/authorized-headers.cjs')], {encoding: 'utf8', timeout: 60000});
    assert.equal(run.status, 0, run.stderr || run.stdout);
});
