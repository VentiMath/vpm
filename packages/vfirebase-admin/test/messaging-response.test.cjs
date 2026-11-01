'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
test('Messaging response errors cannot become delivered messages or lose their error context', () => {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/messaging-response.cjs')], {encoding: 'utf8', timeout: 120000});
    assert.equal(run.status, 0, run.stderr || run.stdout);
});
