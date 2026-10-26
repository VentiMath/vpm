'use strict';
// Compare a first require in fresh processes. Source copies happen before timing;
// startup/process spawning and the test-only vm loader are excluded.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-mime-bench-'));
const dbDirectory = path.join(directory, 'node_modules/mime-db');
fs.mkdirSync(dbDirectory, { recursive: true });
for (const file of ['index.js', 'mimeScore.js']) fs.copyFileSync(path.join(__dirname, '../test/fixtures/mime-types-3.0.2', file), path.join(directory, file));
fs.copyFileSync(path.join(__dirname, '../../vmime-db/db.json'), path.join(dbDirectory, 'db.json'));
fs.writeFileSync(path.join(dbDirectory, 'index.js'), "module.exports = require('./db.json');\n");
const measure = file => {
  const script = `const start = performance.now(); const value = require(${JSON.stringify(file)}); console.log(JSON.stringify([performance.now() - start, Object.keys(value).length]));`;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout)[0];
};
try {
  const rows = [];
  for (const [name, files] of [
    ['database', [path.join(dbDirectory, 'index.js'), path.resolve(__dirname, '../../vmime-db/index.js')]],
    ['MIME utilities including database', [path.join(directory, 'index.js'), path.resolve(__dirname, '../index.js')]],
  ]) {
    const samples = [[], []];
    for (let round = 0; round < 11; round++) {
      for (const index of round % 2 ? [1, 0] : [0, 1]) samples[index].push(measure(files[index]));
    }
    const values = samples.map(list => list.sort((a, b) => a - b)[5]);
    rows.push({ case: name, 'upstream ms': +values[0].toFixed(3), 'VPM ms': +values[1].toFixed(3) });
  }
  console.log(`Runtime: ${process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version}`);
  console.log('Median first require time in 11 fresh processes per implementation; warm filesystem caches.');
  console.table(rows);
} finally { fs.rmSync(directory, { recursive: true, force: true }); }
