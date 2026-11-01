'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {spawnSync} = require('node:child_process'), {pathToFileURL} = require('node:url');
const hashes = require('./upstream/SHA256.json');
for (const [file, hash] of Object.entries(hashes)) assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
const temporary = fs.mkdtempSync(path.join(__dirname, '.run-'));
try {
  for (const variant of ['upstream', 'vpm']) for (const file of ['index.js', 'classnames.js', 'lite.js']) {
    const lite = file === 'lite.js';
    const target = path.resolve(__dirname, variant === 'upstream' ? `node_modules/clsx/dist/${lite ? 'lite' : 'clsx'}.mjs` : `../../packages/vclsx/${lite ? 'lite' : 'runtime'}.mjs`);
    const source = fs.readFileSync(path.join(__dirname, 'upstream', file), 'utf8').replace(/(['"])\.\.\/src(?:\/lite)?\1/g, JSON.stringify(pathToFileURL(target).href));
    const test = path.join(temporary, file + '.mjs');fs.writeFileSync(test, source);
    const run = spawnSync(process.execPath, [test], {encoding: 'utf8'});
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /Passed:\s+\d+/);
  }
  console.log('All 32 unchanged clsx 2.1.1 tests pass against both implementations.');
} finally {fs.rmSync(temporary, {recursive: true, force: true});}
