'use strict';
process.env.NODE_ENV = 'test'; process.env.DEBUG = '';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const load = require('./load.cjs');
const startup = process.env.STARTUP === '1';
const implementations = [load(), startup ? load.previousStartup() : load(true), require('..')];
const count = Number(process.env.COUNT || 10000);
const registrations = Math.min(count, startup ? 5000 : 1000);
const rounds = 12;
const orders = [[0,1,2], [0,2,1], [1,0,2], [1,2,0], [2,0,1], [2,1,0]];
const cases = [];
const pass = (req, res, next) => next();
const finish = (req, res) => res.send('hello');
function normalized(result) {
  if (typeof result === 'function') return result.router.stack.map(layer => [layer.name, layer.route?.path, layer.route?.stack.length]);
  return { status: result.statusCode, headers: result.fields, body: Buffer.isBuffer(result.body) ? result.body.toString() : result.body };
}
function add(name, inputs, setup, iterations = count) {
  const functions = implementations.map(setup);
  for (const input of inputs) {
    const outputs = functions.map(fn => normalized(fn(input)));
    assert.deepEqual(outputs[1], outputs[0], name); assert.deepEqual(outputs[2], outputs[0], name);
  }
  cases.push({ name, inputs, functions, iterations });
}
function setHeader(name, value) { this.fields[name.toLowerCase()] = value; return this; }
function getHeader(name) { return this.fields[name.toLowerCase()]; }
function removeHeader(name) { delete this.fields[name.toLowerCase()]; }
function end(body) { this.body = body; this.finished = true; return this; }
function fail(error) { throw error || new Error('benchmark fell through'); }
function invoke(app, headers = {}, method = 'GET') {
  return url => {
    const req = { url, method, headers, socket: { remoteAddress: '127.0.0.1' } };
    const res = { fields: Object.create(null), statusCode: 200, setHeader, getHeader, removeHeader, end };
    app(req, res, fail); assert.equal(res.finished, true);
    return res;
  };
}
add('create application', ['/'], E => () => E(), registrations);
add('register one route', ['/hello', '/world'], E => path => E().get(path, finish), registrations);
add('register 20 middleware', ['/api'], E => path => E().use(path, Array(20).fill(pass)), registrations);
add('register route with 20 handlers', ['/hello'], E => path => E().get(path, Array(20).fill(pass), finish), registrations);
add('dispatch res.end', ['/hello'], E => { const a = E(); a.get('/hello', (req,res) => res.end('hello')); return invoke(a); });
add('send short string with ETag', ['/hello'], E => { const a = E(); a.get('/hello', finish); return invoke(a); });
add('send short string without ETag', ['/hello'], E => { const a = E().disable('etag'); a.get('/hello', finish); return invoke(a); });
add('send JSON with ETag', ['/hello'], E => { const a = E(); a.get('/hello', (req,res) => res.json({ name: 'VentiMath', value: 42 })); return invoke(a); });
add('send JSON without ETag', ['/hello'], E => { const a = E().disable('etag'); a.get('/hello', (req,res) => res.json({ name: 'VentiMath', value: 42 })); return invoke(a); });
add('send Unicode string', ['/hello'], E => { const a = E(); a.get('/hello', (req,res) => res.send('VentiMath: 数学 🧮')); return invoke(a); });
add('send 4 KiB JSON', ['/hello'], E => { const a = E(); const data = { value: 'x'.repeat(4096) }; a.get('/hello', (req,res) => res.json(data)); return invoke(a); });
add('parameter plus query JSON', ['/users/42?q=one', '/users/a%2Fb?q=two'], E => { const a = E(); a.get('/users/:id', (req,res) => res.json({ id: req.params.id, query: req.query })); return invoke(a); });
add('extended query JSON', ['/?a[b]=1&a[c][]=x&a[c][]=y'], E => { const a = E().set('query parser', 'extended'); a.get('/', (req,res) => res.json(req.query)); return invoke(a); });
add('20 middleware then JSON', ['/hello'], E => { const a = E(); a.use(Array(20).fill(pass)); a.get('/hello', (req,res) => res.json({ ok: true })); return invoke(a); });
add('mounted application JSON', ['/child/hello'], E => { const a = E(), child = E(); child.get('/hello', (req,res) => res.json({ base: req.baseUrl })); a.use('/child', child); return invoke(a); });
add('absolute URL plus JSON', ['http://example.test/hello?q=1'], E => { const a = E(); a.get('/hello', (req,res) => res.json({ ok: true })); return invoke(a); });
add('negotiate and send JSON', ['/hello'], E => { const a = E(); a.get('/hello', (req,res) => res.format({ json() { res.json({ ok: true }); }, text() { res.send('ok'); } })); return invoke(a, { accept: 'application/json, text/plain;q=0.5' }); });
add('set response headers', ['/hello'], E => { const a = E(); a.get('/hello', (req,res) => res.set({ 'X-Test': 'one', 'X-Other': 'two' }).end('ok')); return invoke(a); });
let checksum = 0;
function measure(fn, inputs, iterations) {
  const retained = new Array(256);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) retained[i & 255] = fn(inputs[i % inputs.length]);
  const elapsed = performance.now() - start;
  for (const value of retained) if (value) checksum += typeof value === 'function' ? value.router.stack.length + 1 : value.statusCode + (value.body?.length || 0);
  return elapsed * 1e6 / iterations;
}
for (const entry of cases) for (const fn of entry.functions) measure(fn, entry.inputs, Math.min(entry.iterations, 2000));
const rows = [];
for (const entry of cases) {
  for (const fn of entry.functions) measure(fn, entry.inputs, Math.min(entry.iterations, 5000));
  const samples = [[], [], []];
  for (let round = 0; round < rounds; round++) for (const index of orders[round % 6]) samples[index].push(measure(entry.functions[index], entry.inputs, entry.iterations));
  const medians = samples.map(values => { const sorted = values.slice().sort((a,b) => a-b); return (sorted[5]+sorted[6])/2; });
  rows.push({ case: entry.name, iterations: entry.iterations, upstreamNs: medians[0], [startup ? 'previousNs' : 'vpmDependenciesNs']: medians[1], vpmNs: medians[2], samples });
}
const hashes = require('./evidence.cjs')();
const result = { recordedAt: new Date().toISOString(), runtime: process.versions, platform: process.platform, arch: process.arch, count, rounds,
  implementations: ['Express 5.3.0 + locked upstream dependencies', startup ? 'vexpress b58bd90 factory + unchanged current VPM application/dependencies' : 'Express 5.3.0 + VPM dependencies', 'vexpress + VPM dependencies'],
  sampleOrder: 'all six permutations, twice', corpusWarmup: 'min(iterations, 2000)', caseWarmup: 'min(iterations, 5000)',
  units: 'nanoseconds/call including synthetic HTTP objects, completion assertion and retention writes; no network I/O', hashes, checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, upstream: Math.round(row.upstreamNs), [startup ? 'previous' : 'dependencies']: Math.round(startup ? row.previousNs : row.vpmDependenciesNs), VPM: Math.round(row.vpmNs) })));
console.log('Consumed checksum:', checksum);
