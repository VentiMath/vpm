'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
test('CRC32C preserves streaming checksums with private tables and valid numeric seeds', () => {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/storage-conformance/crc32c.cjs')], {encoding: 'utf8', timeout: 60000});
    assert.equal(run.status, 0, run.stderr || run.stdout);
});
