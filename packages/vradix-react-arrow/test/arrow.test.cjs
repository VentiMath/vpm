'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs'), { spawnSync } = require('node:child_process'), { createHash } = require('node:crypto');
for (const variant of ['upstream', 'vpm']) for (const version of ['19.1', '19.2']) for (const mode of ['client', 'server']) test([variant, version, mode, 'SVG arrow'].join(' '), () => {
  const r = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/radix-arrow-conformance/run.cjs'), variant, version, mode], { encoding: 'utf8', timeout: 30000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
test('comparison source hashes are pinned', () => {
  const root = path.resolve(__dirname, '../../../scripts/radix-arrow-conformance/node_modules/@radix-ui/react-arrow');
  for (const [file, hash] of Object.entries(require('../PROVENANCE.json').sourceSHA256)) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), hash);
});
