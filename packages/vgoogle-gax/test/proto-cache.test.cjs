'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');

test('JSON proto cache preserves contracts and fixes upstream ownership failures', () => {
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/gax-conformance/proto-cache.cjs')], {encoding: 'utf8', timeout: 60000});
    assert.equal(result.status, 0, result.stderr || result.stdout);
});
