'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('HTTP response projection owns parsing state and preserves wire diagnostics', () => {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/http-response.cjs')], {encoding: 'utf8', timeout: 60000});
    assert.equal(run.status, 0, run.stderr || run.stdout);
});
