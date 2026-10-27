'use strict';
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { performance } = require('node:perf_hooks');
const upstream = require('../test/upstream.cjs');
const vpm = require('..');
const iconv = require('viconv-lite');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const implementations = [upstream];
const labels = ['upstream'];
// Optional previous VPM source, e.g. git show <commit>:packages/vraw-body/index.js.
// Resolve its dependencies through this workspace, keeping codec versions equal.
if (process.argv[2] === '--baseline') {
  const filename = path.resolve(process.argv[3]);
  const module = { exports: {} };
  vm.compileFunction(fs.readFileSync(filename, 'utf8'), ['require', 'module', 'exports'], { filename })(
    createRequire(require.resolve('..')), module, module.exports);
  implementations.push(module.exports); labels.push('previous VPM');
} else if (process.argv.length > 2) {
  throw new Error('Usage: compare.cjs [--baseline previous-index.js]');
}
implementations.push(vpm); labels.push('current VPM');
const single = [Buffer.alloc(1024, 97)];
const binary = Array.from({ length: 64 }, () => Buffer.alloc(1024, 97));
const utf8 = Array.from({ length: 16 }, () => Buffer.from('café 💩 '.repeat(100)));
const cases = [
  ['Buffer 1 KiB / promise', single, undefined, false],
  ['Buffer 1 KiB / callback', single, undefined, true],
  ['Buffer 1 KiB / callback + bounds', single, { length: '1024', limit: 102400 }, true],
  ['Buffer 64 KiB / one chunk', [Buffer.alloc(65536, 97)], { length: 65536, limit: '128kb' }, false],
  ['Buffer 64 KiB / 64 chunks', binary, { length: 65536, limit: '128kb' }, false],
  ['UTF-8 1 KiB', single, { encoding: true, limit: '100kb' }, false],
  ['UTF-8 1 KiB / callback + bounds', single, { encoding: true, length: '1024', limit: 102400 }, true],
  ['UTF-8 16 chunks', utf8, { encoding: true, limit: '100kb' }, false],
  ['Shift-JIS 8 KiB', [iconv.encode('日本'.repeat(2048), 'shiftjis')], 'shiftjis', false],
];
function read(implementation, chunks, options, callback) {
  const stream = new PassThrough();
  const result = callback ? new Promise((resolve, reject) => implementation(stream, options, (error, value) => error ? reject(error) : resolve(value))) : implementation(stream, options);
  for (const chunk of chunks) stream.write(chunk);
  stream.end();
  return result;
}
let sink = 0;
async function sample(implementation, chunks, options, callback, count) {
  const start = performance.now();
  for (let i = 0; i < count; i++) sink += (await read(implementation, chunks, options, callback)).length;
  return (performance.now() - start) * 1e6 / count;
}
async function run() {
  console.log(`Runtime: ${process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version}`);
  console.log('Median ns/read, 9 rotating samples × 5,000 real PassThrough reads; 5,000 warmup reads per implementation.');
  console.log(labels.join(' → '));
  for (const [name, chunks, options, callback] of cases) {
    const expected = await read(upstream, chunks, options, callback);
    for (const implementation of implementations) {
      assert.deepEqual(await read(implementation, chunks, options, callback), expected);
      await sample(implementation, chunks, options, callback, 5000);
    }
    const values = implementations.map(() => []);
    for (let round = 0; round < 9; round++) {
      for (let step = 0; step < implementations.length; step++) {
        const index = (round + step) % implementations.length;
        values[index].push(await sample(implementations[index], chunks, options, callback, 5000));
      }
    }
    const medians = values.map(list => Math.round(list.sort((a, b) => a - b)[4]));
    console.log(`${name}: ${medians.join(' → ')} (${((medians.at(-1) / medians[0] - 1) * 100).toFixed(1)}% vs upstream)`);
  }
  assert.ok(sink > 0);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
