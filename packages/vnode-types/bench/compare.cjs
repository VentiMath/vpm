'use strict';
// Same consumers, compiler, standard library, and strict checks on both sides.
// Install scripts/type-consumers first. Run without other CPU-heavy jobs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, configuration, runtimeTypeTests, compiler } = require('../../../scripts/platform-types.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-types-bench-'));
const tsc = compiler();
const samples = { upstream: [], vpm: [] };
const configs = {};
function run(name) {
  const result = spawnSync(process.execPath, [tsc.path, '-p', configs[name], '--extendedDiagnostics', '--pretty', 'false'], {
    cwd: root, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const fields = {};
  for (const line of result.stdout.split('\n')) {
    const match = /^([^:]+):\s+([\d.]+)/.exec(line);
    if (match) fields[match[1]] = Number(match[2]);
  }
  return fields;
}
try {
  for (const name of Object.keys(samples)) {
    configs[name] = path.join(directory, name + '.json');
    fs.writeFileSync(configs[name], JSON.stringify(configuration(runtimeTypeTests(), { baseline: name === 'upstream' })));
    run(name); // One unrecorded filesystem-cache warmup per variant.
  }
  for (let round = 0; round < 5; round++) {
    for (const name of round % 2 ? ['vpm', 'upstream'] : ['upstream', 'vpm']) samples[name].push(run(name));
  }
  const median = values => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
  const metrics = ['Files', 'Lines of Definitions', 'Memory used', 'Check time', 'Total time'];
  const results = Object.fromEntries(Object.entries(samples).map(([name, runs]) => [name,
    Object.fromEntries(metrics.map(metric => [metric, median(runs.map(run => run[metric]))])),
  ]));
  console.log(JSON.stringify({ runtime: process.version, compiler: tsc.version, platform: `${process.platform}/${process.arch}`,
    date: new Date().toISOString().slice(0, 10), consumers: runtimeTypeTests().length,
    method: 'Five fresh compiler processes per variant, alternating order, after one warmup each. ES2022 only, strict, skipLibCheck false.',
    units: { 'Memory used': 'KiB', 'Check time': 'seconds', 'Total time': 'seconds' }, results, samples,
  }, null, 2));
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
