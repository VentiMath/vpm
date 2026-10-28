'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const factories = [require('../test/fixtures/depd-2.0.0.cjs'), require('..')];
const workloads = require('./workloads.cjs');
const count = Number(process.env.COUNT || 10000), rounds = 12;
const rows = [], retainedEvents = new Array(256), retainedOutput = new Array(256);
let checksum = 0, events = 0, writes = 0;
const listener = error => { retainedEvents[events++ & 255] = error; };
const originalWrite = process.stderr.write;
const tty = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');
const oldIgnore = process.env.NO_DEPRECATION, oldTrace = process.env.TRACE_DEPRECATION;
const oldNoFlag = process.noDeprecation, oldTraceFlag = process.traceDeprecation;
process.noDeprecation = false; process.traceDeprecation = false;
process.stderr.write = value => { retainedOutput[writes++ & 255] = value; return true; };
Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: false });
function consume(value, mode) {
  if (typeof value === 'number') return value;
  if (typeof value === 'function') return value.length + 1;
  if (value && mode === 'wrap property') return Number(Object.getOwnPropertyDescriptor(value, 'value').get !== undefined);
  return 1;
}
function measure(fn, mode, iterations) {
  const retained = new Array(256);
  const started = performance.now();
  for (let i = 0; i < iterations; i++) retained[i & 255] = fn(i & 255);
  const elapsed = performance.now() - started;
  for (const value of retained) checksum += consume(value, mode);
  for (const error of retainedEvents) if (error) checksum += error.message.length + error.stack.length;
  for (const text of retainedOutput) if (text) checksum += text.length;
  return elapsed * 1e6 / iterations;
}
try {
  for (const [name, mode, ignored, hasListener, trace, limit] of [
    ['factory', 'factory', false, false, false],
    ['wrap function', 'wrap function', true, false, false],
    ['wrap property', 'wrap property', true, false, false],
    ['suppressed / direct', 'direct', true, false, false, count * 20],
    ['suppressed / function', 'function', true, false, false, count * 20],
    ['suppressed / property get', 'get', true, false, false, count * 20],
    ['suppressed / property set', 'set', true, false, false, count * 20],
    ['already warned / direct', 'direct', false, true, false],
    ['already warned / function', 'function', false, true, false],
    ['already warned / property get', 'get', false, true, false],
    ['factory + first event', 'first', false, true, false],
    ['factory + first stderr', 'first', false, false, false],
    ['factory + first traced stderr', 'first', false, false, true],
  ]) {
    process.env.NO_DEPRECATION = ignored ? '*' : '';
    process.env.TRACE_DEPRECATION = trace ? '*' : '';
    if (hasListener) process.on('deprecation', listener);
    const functions = factories.map(factory => workloads(factory, mode));
    const iterations = limit || count;
    const samples = [[], []];
    // Warm and measure through the same call site: Bun can report an enclosing
    // call frame when optimizing a loop, and depd intentionally keys by caller.
    for (let round = -2; round < rounds; round++) for (const index of round % 2 ? [1, 0] : [0, 1]) {
      const priorEvents = events, priorWrites = writes;
      const elapsed = measure(functions[index], mode, round < 0 ? Math.min(iterations, 2000) : iterations);
      if (round < 0) continue;
      samples[index].push(elapsed);
      if (mode === 'first') assert.equal(hasListener ? events - priorEvents : writes - priorWrites, iterations);
      else {
        assert.equal(events, priorEvents, name + ': implementation ' + index + (events !== priorEvents ? '\n' + retainedEvents[(events - 1) & 255].stack : ''));
        assert.equal(writes, priorWrites, name + ': implementation ' + index);
      }
    }
    const medians = samples.map(sample => { const sorted = sample.slice().sort((a,b) => a-b); return (sorted[5] + sorted[6]) / 2; });
    rows.push({ case: name, iterations, upstreamNs: medians[0], vpmNs: medians[1], ratio: medians[1]/medians[0], samples });
    if (hasListener) process.removeListener('deprecation', listener);
  }
} finally {
  process.removeListener('deprecation', listener);
  process.stderr.write = originalWrite;
  if (tty) Object.defineProperty(process.stderr, 'isTTY', tty); else delete process.stderr.isTTY;
  if (oldIgnore === undefined) delete process.env.NO_DEPRECATION; else process.env.NO_DEPRECATION = oldIgnore;
  if (oldTrace === undefined) delete process.env.TRACE_DEPRECATION; else process.env.TRACE_DEPRECATION = oldTrace;
  process.noDeprecation = oldNoFlag; process.traceDeprecation = oldTraceFlag;
}
const files = ['../index.js', '../validate.cjs', '../test/fixtures/depd-2.0.0.cjs', 'compare.cjs', 'workloads.cjs'];
const hashes = Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex')]));
const report = { recordedAt: new Date().toISOString(), runtime: process.versions, platform: process.platform, arch: process.arch, count, rounds, sampleOrder: 'alternating A/B and B/A', warmup: '2 x min(iterations, 2000) per implementation and case through the same call site', units: 'nanoseconds/call including 256-slot retention writes, excluding final result consumption', note: 'stderr is captured in memory; first-warning cases include factory creation; already-warned cases retain listeners. No HTTP throughput claim.', hashes, checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(report, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, upstream: Math.round(row.upstreamNs), vpm: Math.round(row.vpmNs), ratio: row.ratio.toFixed(2) })));
console.log('Consumed checksum:', checksum);
