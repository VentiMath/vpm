'use strict';
// Interleave warmed, isolated server processes in short blocks to reduce drift.
// This measures sequential keep-alive HTTP round trips, not cold starts.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '../../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const median = values => {
  const sorted = values.slice().sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};
function digest(directory) {
  const value = createHash('sha256');
  for (const relative of fs.readdirSync(directory, { recursive: true }).sort()) {
    if (relative.startsWith('node_modules') || !/\.(?:js|json|d\.ts)$/.test(relative) || /^(?:test|bench)\//.test(relative)) continue;
    value.update(relative + '\0').update(fs.readFileSync(path.join(directory, relative)));
  }
  return value.digest('hex');
}
const graph = new Set();
function visit(name) {
  if (graph.has(name)) return;
  graph.add(name);
  for (const dep of Object.keys(require(path.join(root, 'packages', name, 'package.json')).dependencies || {})) visit(dep);
}
visit('vfunctions-framework');
const variants = ['upstream', 'original', 'before', 'after'];
const orders = [];
for (const sequence of [variants, variants.slice().reverse()]) {
  for (let i = 0; i < 4; i++) orders.push(sequence.slice(i).concat(sequence.slice(0, i)));
}
const warmups = Number(process.env.VPM_WARMUPS || 10000);
const iterations = Number(process.env.VPM_ITERATIONS || 1000);
assert.ok(Number.isSafeInteger(warmups) && warmups > 0);
assert.ok(Number.isSafeInteger(iterations) && iterations > 0);
const fixtures = {
  original: require('./fixtures/vfunctions-framework-119f04c.tar.json'),
  before: require('./fixtures/vfunctions-framework-f4e1f06.tar.json'),
};
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vframework-steady-'));
const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
const report = {
  date: new Date().toISOString(), runtime: process.version, bun: process.versions.bun || null,
  platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model,
  ci: process.env.GITHUB_ACTIONS ? { repository: process.env.GITHUB_REPOSITORY,
    runId: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, commit: process.env.GITHUB_SHA } : null,
  upstream: '@google-cloud/functions-framework@5.0.2', fixtures,
  calibration: process.env.VPM_CALIBRATION === '1',
  afterRuntime: process.env.VPM_CALIBRATION === '1' ? { fixture: fixtures.before } : { workspace: 'packages/vfunctions-framework/lib' },
  installedUpstreamGraph: require('./dependencies.cjs')(), vpmExternalDependencies: graph.size - 1,
  sourceSha256: Object.fromEntries([...graph].sort().map(name => [name, digest(path.join(root, 'packages', name))])),
  harnessSha256: Object.fromEntries(['steady.cjs', 'steady-worker.cjs', 'workloads.cjs', 'dependencies.cjs'].map(file => [file, hash(fs.readFileSync(path.join(__dirname, file)))])),
  consumerLockSha256: hash(fs.readFileSync(path.join(root, 'scripts/consumers/package-lock.json'))),
  methodology: 'Four isolated server processes with the same dependency installation, one shared checked client in the parent process. Servers warmed before measurement, then interleaved in eight balanced short-block orders per workload. Wall microseconds/request measure round trips; server CPU excludes the client and includes the small per-block IPC control cost. Startup excluded. Ratios pair each after block with the corresponding baseline block. Bun CloudEvents omit broken upstream but retain all three VPM variants. No sample trimming.',
  warmups, iterations, orders, samples: {}, medians: {},
};

function request(port, entry) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, agent,
      path: entry.path || '/', method: entry.body ? 'POST' : 'GET',
      headers: { ...(entry.body ? { 'content-length': Buffer.byteLength(entry.body) } : {}), ...entry.headers } }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; });
      res.on('error', reject);
      res.on('end', () => {
        try { assert.equal(res.statusCode, 200); assert.equal(body, entry.expected); resolve(); }
        catch (error) { reject(error); }
      });
    });
    req.setTimeout(10000, () => req.destroy(new Error('benchmark request timed out')));
    req.on('error', reject); req.end(entry.body);
  });
}
const cases = require('./workloads.cjs');
const workers = {};
function startWorker(base) {
  const child = spawn(process.execPath, [path.join(__dirname, 'steady-worker.cjs'), base], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: { ...process.env, NODE_ENV: 'production' },
  });
  const pending = new Map(); let sequence = 0; let output = '';
  let readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  child.on('message', message => {
    if (message.ready) { readyResolve(); return; }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error)); else request.resolve(message);
  });
  function fail(error) {
    readyReject(error);
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
    pending.clear();
  }
  child.on('error', fail);
  child.on('exit', (code, signal) => fail(new Error(`worker exited: ${code}/${signal}\n${output}`)));
  return { child, ready, call(action, extra = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('worker control timed out: ' + action)); }, 30000);
      pending.set(id, { resolve, reject, timer });
      child.send({ id, action, ...extra });
    });
  } };
}

async function run() {
  const bases = { upstream: path.join(root, 'scripts/consumers/node_modules/@google-cloud/functions-framework/build/src'), after: path.resolve(__dirname, '../lib') };
  for (const [variant, fixture] of Object.entries(fixtures)) {
    const archive = path.join(__dirname, 'fixtures', fixture.archive);
    assert.equal(hash(fs.readFileSync(archive)), fixture.sha256);
    const folder = path.join(temporary, variant); fs.mkdirSync(folder);
    const extraction = spawnSync('tar', ['-xzf', archive, '-C', folder], { encoding: 'utf8' });
    assert.equal(extraction.status, 0, extraction.stderr);
    fs.symlinkSync(path.join(root, 'packages/vfunctions-framework/node_modules'), path.join(folder, 'node_modules'), 'dir');
    bases[variant] = path.join(folder, 'packages/vfunctions-framework/lib');
  }
  if (report.calibration) bases.after = bases.before;
  for (const variant of variants) {
    workers[variant] = startWorker(bases[variant]);
    await workers[variant].ready;
  }
  for (let caseIndex = 0; caseIndex < cases.length; caseIndex++) {
    const entry = cases[caseIndex]; const ports = {};
    const active = variants.filter(v => !(process.versions.bun && entry.signatureType && v === 'upstream'));
    const samples = report.samples[entry.name] = Object.fromEntries(active.map(v => [v, []]));
    try {
      for (const variant of active) {
        ports[variant] = (await workers[variant].call('open', { name: entry.name })).port;
      }
      for (const variant of orders[caseIndex].filter(v => active.includes(v))) {
        for (let n = 0; n < warmups; n++) await request(ports[variant], entry);
      }
      for (const order of orders) for (const variant of order.filter(v => active.includes(v))) {
        await workers[variant].call('start');
        const began = performance.now();
        for (let n = 0; n < iterations; n++) await request(ports[variant], entry);
        const wallUs = (performance.now() - began) * 1000 / iterations;
        const used = await workers[variant].call('stop');
        samples[variant].push({ wallUs, cpuUs: (used.user + used.system) / iterations });
      }
      const summary = report.medians[entry.name] = {};
      for (const metric of ['wallUs', 'cpuUs']) {
        summary[metric] = Object.fromEntries(active.map(v => [v, median(samples[v].map(s => s[metric]))]));
        for (const baseline of active.filter(v => v !== 'after')) {
          summary[metric]['afterTo' + baseline[0].toUpperCase() + baseline.slice(1)] = median(samples.after.map((s, i) => s[metric] / samples[baseline][i][metric]));
        }
      }
    } finally { for (const variant of Object.keys(ports)) await workers[variant].call('close'); }
  }
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.medians, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { agent.destroy(); for (const worker of Object.values(workers)) worker.child.kill(); fs.rmSync(temporary, { recursive: true, force: true }); });
