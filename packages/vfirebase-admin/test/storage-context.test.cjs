'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('Storage contexts keep project and emulator routing local to each client', {timeout: 90000}, () => {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/storage-context.cjs')], {encoding: 'utf8', timeout: 90000});
    assert.equal(run.status, 0, run.stderr || run.stdout);
});
