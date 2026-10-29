'use strict';
// Compare upstream, the previous runtime and the current runtime under the
// same dependency installation. Every variant runs in its own fresh process.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const fixture = require('./fixtures/vfunctions-framework-119f04c.tar.json');
const archive = path.join(__dirname, 'fixtures', fixture.archive);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(fs.readFileSync(archive)), fixture.sha256);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vframework-benchmark-'));
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
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
  if (graph.has(name)) return; graph.add(name);
  for (const dep of Object.keys(require(path.join(root, 'packages', name, 'package.json')).dependencies || {})) visit(dep);
}
visit('vfunctions-framework');
const orders = [ ['upstream', 'previous', 'vpm'], ['previous', 'vpm', 'upstream'], ['vpm', 'upstream', 'previous'],
  ['vpm', 'previous', 'upstream'], ['previous', 'upstream', 'vpm'], ['upstream', 'vpm', 'previous'] ];
const rounds = Number(process.env.VPM_BENCH_ROUNDS || 6);
assert.ok(Number.isInteger(rounds) && rounds > 0 && rounds <= 6);
const modes = (process.env.VPM_BENCH_MODES || 'startup-cjs,startup-esm,http').split(',');
for (const mode of modes) assert.ok(['startup-cjs', 'startup-esm', 'http'].includes(mode));
const report = {
  date: new Date().toISOString(), runtime: process.version, bun: process.versions.bun || null,
  platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model,
  upstream: '@google-cloud/functions-framework@5.0.2', previous: fixture,
  installedUpstreamGraph: require('./dependencies.cjs')(), vpmExternalDependencies: graph.size - 1,
  sourceSha256: Object.fromEntries([...graph].sort().map(name => [name, digest(path.join(root, 'packages', name))])),
  harnessSha256: Object.fromEntries(['optimize.cjs', 'worker.cjs', 'dependencies.cjs'].map(file => [file, hash(fs.readFileSync(path.join(__dirname, file)))])),
  consumerLockSha256: hash(fs.readFileSync(path.join(root, 'scripts/consumers/package-lock.json'))),
  methodology: 'Three-way fresh-process comparison. Six execution orders balance all variants. Previous runtime is the unchanged 119f04c snapshot with the same VPM dependencies. Extraction and process launch excluded. HTTP: 200 warmups, 1000 checked sequential keep-alive requests per case. Ratios are medians of within-round ratios to avoid pooled-median reversals. Startup includes imports, configuration, loading and server readiness. No Bun event speed comparison because upstream fails.',
  orders: orders.slice(0, rounds), samples: {}, medians: {},
};
try {
  const extracted = spawnSync('tar', ['-xzf', archive, '-C', temporary], { encoding: 'utf8' });
  assert.equal(extracted.status, 0, extracted.stderr);
  // Use the package's dependency links, including Bun's isolated workspace links.
  fs.symlinkSync(path.join(root, 'packages/vfunctions-framework/node_modules'), path.join(temporary, 'node_modules'), 'dir');
  for (const mode of modes) {
    report.samples[mode] = { upstream: [], previous: [], vpm: [] };
    for (let round = 0; round < rounds; round++) for (const variant of orders[round]) {
      const [action, source] = mode.split('-');
      const result = spawnSync(process.execPath, [path.join(__dirname, 'worker.cjs'), variant, action, source || 'cjs'], {
        encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024,
        env: { ...process.env, NODE_ENV: 'production', VPM_EXTENDED_WORKLOADS: '1',
          VPM_PREVIOUS_FRAMEWORK_LIB: path.join(temporary, 'packages/vfunctions-framework/lib') },
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      report.samples[mode][variant].push(JSON.parse(result.stdout));
    }
    const values = report.samples[mode]; report.medians[mode] = {};
    for (const key of Object.keys(values.upstream[0])) {
      report.medians[mode][key] = {
        upstream: median(values.upstream.map(x => x[key])),
        previous: median(values.previous.map(x => x[key])),
        vpm: median(values.vpm.map(x => x[key])),
        vpmToUpstream: median(values.vpm.map((x, i) => x[key] / values.upstream[i][key])),
        vpmToPrevious: median(values.vpm.map((x, i) => x[key] / values.previous[i][key])),
        previousToUpstream: median(values.previous.map((x, i) => x[key] / values.upstream[i][key])),
      };
    }
  }
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.medians, null, 2));
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
