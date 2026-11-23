'use strict';
// Run the real, unchanged fixture test from a read-only app export. The selected
// test uses local files only; importer entry points are not invoked.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict'), {execFileSync, spawnSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const app = process.argv[2], ref = process.argv[3] || 'origin/main';
if (!app) throw Error('Usage: node fixture-app.cjs /path/to/app [ref]');
const sourceNames = [
 'tools/historical-contest-import/model.test.ts', 'tools/historical-contest-import/model.ts',
 'tools/historical-contest-import/import.ts', 'tools/historical-contest-import/archiveAudit.ts',
 'tools/historical-contest-import/search.ts', 'functions/src/problemSearchCitations.ts',
 'functions/src/privateFields.ts', 'src/components/problems/types.ts',
];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpngjs-fixture-app-'));
try {
 const hashes = {};
 for (const name of sourceNames) {
  const bytes = execFileSync('git', ['show', ref + ':' + name], {cwd: app});
  const file = path.join(temp, name); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, bytes);
  hashes[name] = createHash('sha256').update(bytes).digest('hex');
 }
 fs.mkdirSync(path.join(temp, 'node_modules'));
 for (const variant of ['upstream', 'vpm']) {
  const entry = variant === 'upstream' ? path.join(__dirname, 'node_modules/pngjs') : process.env.VPM_PNG_ENTRY || path.resolve(__dirname, '../../packages/vpngjs');
  const alias = path.join(temp, 'node_modules/pngjs'); fs.symlinkSync(entry, alias, 'dir');
  const r = spawnSync('bun', ['test', sourceNames[0], '--test-name-pattern', 'decodes the complete PNG'], {cwd: temp, encoding: 'utf8', timeout: 120000});
  assert.equal(r.status, 0, r.stdout + r.stderr);
  console.log(variant, (r.stdout + r.stderr).split('\n').filter(s => /pass|fail|Ran |expect\(/.test(s)).join('\n'));
  fs.unlinkSync(alias);
 }
 const report = {appCommit: execFileSync('git', ['rev-parse', ref], {cwd: app, encoding: 'utf8'}).trim(), sourceSHA256: hashes, test: 'decodes the complete PNG, verifies CRC, hashes and natural dimensions', variants: ['upstream', 'vpm'], privateSourceCommitted: false};
 if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(report, null, 2) + '\n');
 console.log(JSON.stringify(report));
} finally {fs.rmSync(temp, {recursive: true, force: true});}
