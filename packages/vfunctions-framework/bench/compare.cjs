'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
function digest(directory) {
  const hash = createHash('sha256');
  for (const relative of fs.readdirSync(directory, { recursive: true }).sort()) {
    if (relative.startsWith('node_modules') || !/\.(?:js|json|d\.ts)$/.test(relative) || /^(?:test|bench)\//.test(relative)) continue;
    hash.update(relative + '\0').update(fs.readFileSync(path.join(directory, relative)));
  }
  return hash.digest('hex');
}
const graph = new Set();
function visit(name) {
  if (graph.has(name)) return; graph.add(name);
  const meta = require(path.join(root, 'packages', name, 'package.json'));
  for (const dep of Object.keys(meta.dependencies || {})) visit(dep);
}
visit('vfunctions-framework');
const evidence = {
  date: new Date().toISOString(), runtime: process.version, bun: process.versions.bun || null,
  platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model,
  upstream: '@google-cloud/functions-framework@5.0.2',
  installedUpstreamGraph: require('./dependencies.cjs')(),
  vpmExternalDependencies: graph.size - 1,
  harnessSha256: Object.fromEntries(['compare.cjs', 'worker.cjs', 'dependencies.cjs'].map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex')])),
  consumerLockSha256: createHash('sha256').update(fs.readFileSync(path.join(root, 'scripts/consumers/package-lock.json'))).digest('hex'),
  sourceSha256: Object.fromEntries([...graph].sort().map(name => [name, digest(path.join(root, 'packages', name))])),
  methodology: '7 alternating fresh-process pairs. Startup excludes process launch and fixture creation; includes imports, option parsing, real module loading and server startup. HTTP: sequential keep-alive, 200 warmups then 1000 validated round trips per case. Microseconds/request include the client. No event comparison on Bun: published upstream fails there.',
  samples: {}, medians: {},
};
for (const mode of ['startup-cjs', 'startup-esm', 'http']) {
  evidence.samples[mode] = { upstream: [], vpm: [] };
  for (let round = 0; round < 7; round++) {
    for (const variant of round % 2 ? ['vpm', 'upstream'] : ['upstream', 'vpm']) {
      const [action, source] = mode.split('-');
      const result = spawnSync(process.execPath, [path.join(__dirname, 'worker.cjs'), variant, action, source || 'cjs'], {
        encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024,
        env: { ...process.env, NODE_ENV: 'production' },
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      evidence.samples[mode][variant].push(JSON.parse(result.stdout));
    }
  }
  const values = evidence.samples[mode]; evidence.medians[mode] = {};
  for (const key of Object.keys(values.upstream[0])) {
    const upstream = median(values.upstream.map(x => x[key])); const vpm = median(values.vpm.map(x => x[key]));
    evidence.medians[mode][key] = { upstream, vpm, ratio: vpm / upstream };
  }
}
const json = JSON.stringify(evidence, null, 2) + '\n';
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, json);
console.log(JSON.stringify(evidence.medians, null, 2));
