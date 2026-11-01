'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('HTTP/2 session generations own their lifecycle and diagnostics', () => {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/http2-session.cjs')], {encoding: 'utf8', timeout: 30000});
    assert.equal(run.status, 0, run.stderr || run.stdout);
});
