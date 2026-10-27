'use strict';
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { performance } = require('node:perf_hooks');
const upstream = require('../test/upstream.cjs');
const vpm = require('..');
const iconv = require('viconv-lite');
const single = [Buffer.alloc(1024, 97)];
const binary = Array.from({ length: 64 }, () => Buffer.alloc(1024, 97));
const utf8 = Array.from({ length: 16 }, () => Buffer.from('café 💩 '.repeat(100)));
const cases = [
  ['Buffer 1 KiB / promise', single, undefined, false],
  ['Buffer 1 KiB / callback', single, undefined, true],
  ['Buffer 64 KiB / 64 chunks', binary, { length: 65536, limit: '128kb' }, false],
  ['UTF-8 1 KiB', single, { encoding: true, limit: '100kb' }, false],
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
  console.log('Median ns/read, 7 alternating samples × 5,000 real PassThrough reads; 5,000 warmup reads per implementation.');
  for (const [name, chunks, options, callback] of cases) {
    assert.deepEqual(await read(vpm, chunks, options, callback), await read(upstream, chunks, options, callback));
    await sample(upstream, chunks, options, callback, 5000);
    await sample(vpm, chunks, options, callback, 5000);
    const values = [[], []]; const implementations = [upstream, vpm];
    for (let round = 0; round < 7; round++) {
      for (const index of round % 2 ? [1, 0] : [0, 1]) values[index].push(await sample(implementations[index], chunks, options, callback, 5000));
    }
    const medians = values.map(list => Math.round(list.sort((a, b) => a - b)[3]));
    console.log(`${name}: ${medians[0]} → ${medians[1]} (${((medians[1] / medians[0] - 1) * 100).toFixed(1)}%)`);
  }
  assert.ok(sink > 0);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
