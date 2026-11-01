'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('Messaging owns payloads, project discovery and ordered batch lifetime', () => {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/messaging-send.cjs')], {encoding: 'utf8', timeout: 60000});
    assert.equal(run.status, 0, run.stderr || run.stdout);
});
