'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs'), { spawnSync } = require('node:child_process'), { createHash } = require('node:crypto');
for (const variant of ['upstream', 'vpm']) for (const version of ['19.1', '19.2']) for (const mode of ['client', 'server']) test([variant, version, mode, 'size hook'].join(' '), () => {
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/radix-use-size-conformance/run.cjs'), variant, version, mode], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
test('comparison source hashes are pinned', () => {
  const root = path.resolve(__dirname, '../../../scripts/radix-use-size-conformance/node_modules/@radix-ui/react-use-size');
  for (const [file, hash] of Object.entries(require('../PROVENANCE.json').sourceSHA256)) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), hash);
});
