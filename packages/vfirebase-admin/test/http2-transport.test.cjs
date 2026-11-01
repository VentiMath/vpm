'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('HTTP/2 request plans own retry bytes and settle stream failures', {timeout: 60000}, () => {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/http2-transport.cjs')], {encoding: 'utf8', timeout: 90000});
    assert.equal(run.status, 0, run.stderr || run.stdout);
});
