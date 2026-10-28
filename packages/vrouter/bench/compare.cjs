'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const load = require('../test/fixtures/load.cjs');
const implementations = [load(), load(true), require('..')];
const count = Number(process.env.COUNT || 10000);
const rounds = 12;
const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const cases = [];
function add(name, inputs, setup, iterations = count) {
  const functions = implementations.map(setup);
  for (const input of inputs) {
    const results = functions.map(fn => normalize(fn(input)));
    assert.deepEqual(results[1], results[0], name); assert.deepEqual(results[2], results[0], name);
  }
  cases.push({ name, inputs, functions, iterations });
}
function normalize(value) {
  if (typeof value === 'function') return value.stack.map(layer => ({ name: layer.name, route: layer.route && layer.route.path, handlers: layer.route && layer.route.stack.length }));
  return value;
}
const finish = (req, res) => res.end(JSON.stringify(req.params));
const pass = (req, res, next) => next();
function invoke(router, method = 'GET') {
  return url => {
    let output;
    router({ url, method }, { end(value) { output = value; } }, error => { throw error || new Error('benchmark fell through'); });
    return output;
  };
}
add('register one static route', ['/hello', '/world'], R => path => R().get(path, finish), Math.min(count, 5000));
add('register one parameter route', ['/users/:id', '/teams/:team'], R => path => R().get(path, finish), Math.min(count, 5000));
add('register route with 20 handlers', ['/hello'], R => path => R().get(path, Array(20).fill(pass), finish), Math.min(count, 2000));
add('register 20 root middleware', ['/'], R => path => R().use(path, Array(20).fill(pass)), Math.min(count, 2000));
add('register 20 mounted middleware', ['/api'], R => path => R().use(path, Array(20).fill(pass)), Math.min(count, 1000));
add('dispatch static route', ['/hello', '/HELLO/'], R => { const r = R(); r.get('/hello', finish); return invoke(r); });
add('dispatch one parameter', ['/users/42', '/users/abc'], R => { const r = R(); r.get('/users/:id', finish); return invoke(r); });
add('dispatch escaped parameter', ['/users/a%20b', '/users/a%2Fb'], R => { const r = R(); r.get('/users/:id', finish); return invoke(r); });
add('dispatch wildcard', ['/files/a/b/c', '/files/a%20b/c'], R => { const r = R(); r.get('/files/*parts', finish); return invoke(r); });
add('dispatch RegExp captures', ['/users/42', '/users/abc'], R => { const r = R(); r.get(/^\/users\/([^/]+)$/, finish); return invoke(r); });
add('dispatch with param callback', ['/users/42', '/users/abc'], R => { const r = R(); r.param('id', (req, res, next, value) => { req.params.id = value + '!'; next(); }); r.get('/users/:id', finish); return invoke(r); });
add('dispatch HEAD fallback', ['/hello'], R => { const r = R(); r.get('/hello', finish); return invoke(r, 'HEAD'); });
add('dispatch after 20 misses', ['/target'], R => { const r = R(); for (let i = 0; i < 20; i++) r.get('/route/' + i, finish); r.get('/target', finish); return invoke(r); });
add('dispatch through 20 middleware', ['/hello'], R => { const r = R(); r.use(Array(20).fill(pass)); r.get('/hello', finish); return invoke(r); });
add('dispatch 20 route handlers', ['/hello'], R => { const r = R(); r.get('/hello', Array(20).fill(pass), finish); return invoke(r); });
add('dispatch nested mergeParams', ['/teams/red/users/42', '/teams/blue/users/99'], R => { const r = R(), child = R({ mergeParams: true }); child.get('/users/:id', finish); r.use('/teams/:team', child); return invoke(r); });
add('dispatch query string', ['/hello?q=1', '/hello?q=2'], R => { const r = R(); r.get('/hello', finish); return invoke(r); });
add('dispatch absolute URL', ['http://example.test/hello?q=1'], R => { const r = R(); r.get('/hello', finish); return invoke(r); });
add('dispatch query requiring full parse', ['/hello?q=a b'], R => { const r = R(); r.get('/hello', finish); return invoke(r); });
add('dispatch long query through 20 middleware', ['/hello?q=' + 'x'.repeat(4096)], R => { const r = R(); r.use(Array(20).fill(pass)); r.get('/hello', finish); return invoke(r); });
add('dispatch error recovery', ['/hello'], R => { const r = R(); const error = new Error('expected'); r.use((req, res, next) => next(error)); r.use((err, req, res, next) => next()); r.get('/hello', finish); return invoke(r); });

let checksum = 0;
function consume(value) {
  if (value === undefined) return 0;
  if (typeof value === 'string') return value.length;
  return value.stack.reduce((n, layer) => n + layer.name.length + (layer.route ? layer.route.stack.length : 0), 0);
}
function measure(fn, inputs, iterations) {
  const retained = new Array(256);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) retained[i & 255] = fn(inputs[i % inputs.length]);
  const elapsed = performance.now() - start;
  for (const value of retained) checksum += consume(value);
  return elapsed * 1e6 / iterations;
}
for (const entry of cases) for (const fn of entry.functions) if (fn) measure(fn, entry.inputs, Math.min(entry.iterations, 2000));
const rows = [];
for (const entry of cases) {
  for (const fn of entry.functions) if (fn) measure(fn, entry.inputs, Math.min(entry.iterations, 5000));
  const samples = [[], [], []];
  for (let round = 0; round < rounds; round++) for (const index of orders[round % 6]) if (entry.functions[index]) samples[index].push(measure(entry.functions[index], entry.inputs, entry.iterations));
  const medians = samples.map(values => {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    return (sorted[5] + sorted[6]) / 2;
  });
  rows.push({ case: entry.name, iterations: entry.iterations, upstreamNs: medians[0], vpmDependenciesNs: medians[1], vpmNs: medians[2],
    upstreamRatio: medians[0] === null ? null : medians[2] / medians[0], callerRatio: medians[1] === null ? null : medians[2] / medians[1], samples });
}
const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
const recordedAt = new Date().toISOString();
const result = { recordedAt, runtime: process.versions, platform: process.platform, arch: process.arch, rounds, count,
  implementations: ['router 2.2.0 + pinned upstream dependencies', 'router 2.2.0 + VPM dependencies (is-promise unchanged)', 'vrouter + VPM dependencies'],
  sampleOrder: 'all six permutations, twice', corpusWarmup: 'min(iterations, 2000)', caseWarmup: 'min(iterations, 5000)',
  units: 'nanoseconds/call including retention writes, excluding final result consumption',
  hashes: Object.fromEntries(['../index.js', '../lib/layer.js', '../lib/route.js', '../lib/handlers.js', '../lib/regexp.js', '../test/fixtures/router-2.2.0/index.js', '../test/fixtures/router-2.2.0/lib/layer.js', '../test/fixtures/router-2.2.0/lib/route.js', '../test/fixtures/load.cjs', '../test/fixtures/is-promise-4.0.0.cjs', '../../vparseurl/index.js', '../../vparseurl/test/fixtures/parseurl-1.3.3.cjs', '../../vpath-to-regexp/index.js', '../../vpath-to-regexp/regex.cjs', '../../vpath-to-regexp/test/fixtures/path-to-regexp-8.4.2.cjs', '../../vdepd/index.js', '../../vdepd/validate.cjs', '../../vdepd/test/fixtures/depd-2.0.0.cjs', '../../vdebug/index.js', '../../vdebug/common.js', '../../vdebug/test/fixtures/debug-4.4.3/common.js', '../../vdebug/test/fixtures/debug-4.4.3/node.js', '../../vdebug/test/fixtures/ms-2.1.3.cjs', '../../vms/index.js', 'compare.cjs'].map(file => [file, hash(file)])), checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, upstream: row.upstreamNs === null ? 'n/a' : Math.round(row.upstreamNs), leaves: row.vpmDependenciesNs === null ? 'n/a' : Math.round(row.vpmDependenciesNs), VPM: Math.round(row.vpmNs), callerRatio: row.callerRatio === null ? 'n/a' : row.callerRatio.toFixed(2) })));
console.log('Consumed checksum:', checksum);
