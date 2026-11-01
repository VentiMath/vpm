'use strict';

// A worker times only one implementation. The coordinator never times code.
// This keeps JIT feedback, retained values, GC heaps and module instances apart.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {spawn} = require('node:child_process');

const median = values => {
  const sorted = values.toSorted((a, b) => a - b);
  return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;
};
function digest(file) {
  const content = fs.statSync(file).isDirectory()
    ? JSON.stringify(fs.readdirSync(file).sort().map(name => [name, digest(path.join(file, name))]))
    : fs.readFileSync(file);
  return createHash('sha256').update(content).digest('hex');
}
const config = {pairs: 4, controls: 2, rounds: 12, warmupMs: 150, blockMs: 10, maxIterations: 1000000};

function supportedRuntime(versions) {
  if (!versions.bun && Number(versions.node.split('.')[0]) !== 24) {
    throw new Error('Record VPM benchmarks on Node 24 or Bun. Other Node versions are not the measurement target.');
  }
}

async function measureCases(library, cases, settings, iterations) {
  const rows = [];
  const retained = new Array(64);
  let checksum = 0;
  async function measure(fn, n, asynchronous) {
    const start = performance.now();
    if (asynchronous) {
      for (let i = 0; i < n; i++) retained[i & 63] = await fn();
    } else {
      for (let i = 0; i < n; i++) retained[i & 63] = fn();
    }
    const elapsed = performance.now() - start;
    // Observe results outside the timed region. Cases validate representative
    // results before warmup and after timing, also outside the timed region.
    for (const value of retained) checksum = (checksum + (typeof value === 'string' ? value.length : value ? 1 : 0)) >>> 0;
    return elapsed * 1e6 / n;
  }
  for (const item of cases) {
    retained.fill(undefined);
    const fn = await item.make(library);
    item.validate(await fn());
    const pilot = await measure(fn, 32, item.async);
    let n = iterations?.[item.name] ?? Math.max(1, Math.min(settings.maxIterations, Math.ceil(settings.blockMs * 1e6 / Math.max(pilot, 1))));
    const until = performance.now() + settings.warmupMs;
    do { await measure(fn, n, item.async); } while (performance.now() < until);
    if (!iterations) {
      const warmed = await measure(fn, Math.max(32, n), item.async);
      n = Math.max(1, Math.min(settings.maxIterations, Math.ceil(settings.blockMs * 1e6 / Math.max(warmed, 1))));
    }
    for (let i = 0; i < 4; i++) await measure(fn, n, item.async);
    const samples = [];
    for (let i = 0; i < settings.rounds; i++) samples.push(await measure(fn, n, item.async));
    item.validate(await fn());
    rows.push({case: item.name, iterations: n, samples});
  }
  return {pid: process.pid, runtime: process.versions, rows, checksum};
}

function child(request, directory, sequence) {
  const requestFile = path.join(directory, `request-${sequence}.json`);
  const resultFile = path.join(directory, `result-${sequence}.json`);
  fs.writeFileSync(requestFile, JSON.stringify({...request, resultFile}));
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
      cwd: process.cwd(),
      env: {...process.env, VPM_BENCH_WORKER: requestFile},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const collect = chunk => { output = (output + chunk).slice(-16000); };
    proc.stdout.on('data', collect);
    proc.stderr.on('data', collect);
    const timer = setTimeout(() => proc.kill('SIGTERM'), 180000);
    proc.once('error', error => { clearTimeout(timer); reject(error); });
    proc.once('close', (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`Benchmark worker failed (${signal ?? code})\n${output}`));
      try { resolve(JSON.parse(fs.readFileSync(resultFile, 'utf8'))); }
      catch (error) { reject(new Error(`Benchmark worker did not return measurements: ${error.message}\n${output}`)); }
    });
  });
}

function rowsFromRuns(runs) {
  const rows = runs[0].upstream.rows.map(row => ({case: row.case, processes: [], controls: []}));
  for (const run of runs) {
    assert.deepEqual(run.upstream.rows.map(r => r.case), rows.map(r => r.case));
    assert.deepEqual(run.vpm.rows.map(r => r.case), rows.map(r => r.case));
    for (let i = 0; i < rows.length; i++) {
      const a = run.upstream.rows[i], b = run.vpm.rows[i];
      assert.equal(a.iterations, b.iterations);
      assert.ok(a.samples.every(x => Number.isFinite(x) && x > 0));
      assert.ok(b.samples.every(x => Number.isFinite(x) && x > 0));
      rows[i][run.control ? 'controls' : 'processes'].push({
        first: run.first, upstreamNs: median(a.samples), vpmNs: median(b.samples),
        changePct: 100 * (median(b.samples) / median(a.samples) - 1),
      });
    }
  }
  return rows;
}

function describe(row) {
  const rounded = number => +number.toFixed(1) || 0; // JSON has no negative zero.
  const compared = row.processes.length ? row.processes : row.controls;
  const changes = compared.map(x => x.changePct);
  const control = Math.max(0, ...row.controls.map(x => Math.abs(x.changePct)));
  const direction = changes.every(x => x < 0) ? -1 : changes.every(x => x > 0) ? 1 : 0;
  // A conservative descriptive check, not a confidence interval or a p-value.
  const supported = row.processes.length > 0 && direction && Math.min(...changes.map(Math.abs)) > Math.max(2, control);
  return {
    case: row.case,
    upstream_ns: Math.round(median(compared.map(x => x.upstreamNs))),
    vpm_ns: Math.round(median(compared.map(x => x.vpmNs))),
    change_pct: rounded(median(changes)),
    upstream_first_pct: rounded(median(compared.filter(x => x.first === 'upstream').map(x => x.changePct))),
    vpm_first_pct: rounded(median(compared.filter(x => x.first === 'vpm').map(x => x.changePct))),
    process_range_pct: changes.map(x => x.toFixed(1)).join(', '),
    control_max_abs_pct: +control.toFixed(1),
    evidence: supported ? (direction < 0 ? 'lower time in every pair, beyond control spread' : 'higher time in every pair, beyond control spread') : 'unestablished at this precision',
  };
}

async function run({root, upstream, vpm, cases, files, cleanup = async () => {}, validationOnly = false}) {
  let directory;
  try {
    supportedRuntime(process.versions);
    assert.ok(cases.length && new Set(cases.map(c => c.name)).size === cases.length, 'Case names must be unique and nonempty');
    if (process.env.VPM_BENCH_WORKER) {
      const request = JSON.parse(fs.readFileSync(process.env.VPM_BENCH_WORKER, 'utf8'));
      const result = await measureCases(request.library === 'upstream' ? upstream : vpm, cases, request.settings, request.iterations);
      fs.writeFileSync(request.resultFile, JSON.stringify(result));
      return result;
    }
    const settings = validationOnly ? {...config, pairs: 2, rounds: 4, warmupMs: 1, blockMs: 0.1, maxIterations: 1000} : config;
    const calibration = process.env.CALIBRATION === '1';
    const first = process.env.BENCH_FIRST ?? 'upstream';
    assert.ok(['upstream', 'vpm'].includes(first), 'BENCH_FIRST must be upstream or vpm');
    const sources = [...new Set([...files, '../../scripts/bench-paired.cjs', '../../scripts/bench-process.cjs'])].sort();
    const hashes = Object.fromEntries(sources.map(file => [file, digest(path.resolve(root, file))]));
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-benchmark-'));
    const runs = [];
    let sequence = 0;
    // Alternate AB/BA; every implementation runs first equally often. Controls
    // also use distinct processes, hence distinct instances of identical code.
    for (const control of calibration ? [true] : [false, true]) {
      const count = control ? settings.controls : settings.pairs;
      for (let pair = 0; pair < count; pair++) {
        const order = (first === 'upstream') !== Boolean(pair % 2) ? ['upstream', 'vpm'] : ['vpm', 'upstream'];
        const result = {pair, control, first: order[0]};
        let iterations;
        for (const variant of order) {
          result[variant] = await child({library: control ? 'upstream' : variant, settings, iterations}, directory, sequence++);
          iterations = Object.fromEntries(result[variant].rows.map(row => [row.case, row.iterations]));
        }
        runs.push(result);
      }
    }
    for (const [file, hash] of Object.entries(hashes)) assert.equal(digest(path.resolve(root, file)), hash, `Source changed during measurement: ${file}`);
    const report = {
      schemaVersion: 2, recordedAt: new Date().toISOString(), runtime: process.versions,
      cpu: os.cpus()[0].model, platform: process.platform, arch: process.arch,
      calibration, validationOnly, settings, hashes,
      methodology: 'One timed implementation per fresh process; four comparison pairs and two identical-source control pairs; balanced AB/BA process order; same iteration count within a pair; warmup and result validation outside timing; raw samples retained without trimming. Per-process medians are the comparison units. This limits JIT cross-contamination and order effects; it does not eliminate environmental noise.',
      runs,
    };
    report.rows = rowsFromRuns(runs);
    report.summary = report.rows.map(describe);
    if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(report, null, 2) + '\n');
    console.table(report.summary);
    return report;
  } finally {
    if (directory) fs.rmSync(directory, {recursive: true, force: true});
    await cleanup();
  }
}

function verify(report, root) {
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.validationOnly, false, 'Validation-only timings are not publishable benchmarks');
  assert.deepEqual(report.settings, config);
  supportedRuntime(report.runtime);
  for (const control of report.calibration ? [true] : [false, true]) {
    const runs = report.runs.filter(r => r.control === control);
    assert.equal(runs.length, control ? config.controls : config.pairs);
    assert.equal(runs.filter(r => r.first === 'upstream').length, runs.length / 2);
    const pids = runs.flatMap(r => [r.upstream.pid, r.vpm.pid]);
    assert.equal(new Set(pids).size, pids.length, 'Every variant must use a fresh process');
    for (const run of runs) for (const variant of ['upstream', 'vpm']) {
      assert.deepEqual(run[variant].runtime, report.runtime);
      for (const row of run[variant].rows) assert.equal(row.samples.length, config.rounds);
    }
  }
  assert.deepEqual(report.rows, rowsFromRuns(report.runs));
  assert.deepEqual(report.summary, report.rows.map(describe));
  if (root) for (const [file, hash] of Object.entries(report.hashes)) assert.equal(digest(path.resolve(root, file)), hash, file);
  return report.summary;
}

module.exports = {run, verify, describe, supportedRuntime};
