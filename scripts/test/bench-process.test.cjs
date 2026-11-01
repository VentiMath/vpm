'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {supportedRuntime, verify, describe} = require('../bench-process.cjs');

function fixture(t, extra = '') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-benchmark-test-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const root = path.join(directory, 'packages/example');
  fs.mkdirSync(root, {recursive: true});
  fs.mkdirSync(path.join(directory, 'scripts'));
  for (const name of ['bench-paired.cjs', 'bench-process.cjs']) fs.copyFileSync(path.join(__dirname, '..', name), path.join(directory, 'scripts', name));
  const source = `const fs=require('node:fs'),assert=require('node:assert/strict');
    const trace=${JSON.stringify(path.join(directory, 'trace'))};
    const upstream={name:'upstream',fn:n=>n+1},vpm={name:'vpm',fn:n=>n+1};
    ${extra}
    const cases=[false,true].map(async=>({name:async?'async':'sync',async,
      make:lib=>{fs.appendFileSync(trace,process.pid+':'+lib.name+'\\n'); return async?async()=>lib.fn(41):()=>lib.fn(41)},
      validate:n=>assert.equal(n,42)}));
    require('../../scripts/bench-paired.cjs').run({root:__dirname,upstream,vpm,cases,files:['run.cjs'],validationOnly:true,
      cleanup:async()=>fs.appendFileSync(trace,process.pid+':cleanup\\n')}).catch(e=>{console.error(e);process.exitCode=1});`;
  fs.writeFileSync(path.join(root, 'run.cjs'), source);
  const reportFile = path.join(directory, 'report.json');
  const result = spawnSync(process.execPath, [path.join(root, 'run.cjs')], {env: {...process.env, OUTPUT: reportFile}, encoding: 'utf8', timeout: 30000});
  return {directory, root, result, report: fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile)) : undefined};
}

test('variants and identical-source controls use distinct processes, balanced orders and checked results', t => {
  const {directory, result, report} = fixture(t);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.runs.length, 4);
  const trace = fs.readFileSync(path.join(directory, 'trace'), 'utf8').trim().split('\n');
  const pids = report.runs.flatMap(run => [run.upstream.pid, run.vpm.pid]);
  assert.equal(new Set(pids).size, 8);
  for (const pid of pids) {
    const entries = trace.filter(line => line.startsWith(pid + ':'));
    assert.equal(entries.length, 3);
    assert.equal(entries[0], entries[1]); // Both cases use the same library.
    assert.equal(entries[2], pid + ':cleanup');
  }
  for (const control of [false, true]) assert.deepEqual(report.runs.filter(r => r.control === control).map(r => r.first), ['upstream', 'vpm']);
  for (const run of report.runs) for (const variant of ['upstream', 'vpm']) {
    assert.deepEqual(run[variant].rows.map(r => r.case), ['sync', 'async']);
    assert.ok(run[variant].rows.every(r => r.samples.length === 4));
  }
  assert.throws(() => verify(report), /Validation-only/);
});

test('a worker validation failure fails the coordinator and still cleans up', t => {
  const {directory, result, report} = fixture(t, 'vpm.fn=()=>0;');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Benchmark worker failed/);
  assert.equal(report, undefined);
  assert.ok(fs.readFileSync(path.join(directory, 'trace'), 'utf8').includes(':cleanup'));
});

test('Node 20 and 22 cannot produce new benchmark reports; Bun and Node 24 can', () => {
  for (const version of ['20.19.0', '22.22.0']) assert.throws(() => supportedRuntime({node: version}), /Node 24/);
  supportedRuntime({node: '24.22.1'});
  supportedRuntime({node: '22.6.0', bun: '1.4.4'});
});

test('a direction that reverses with order or overlaps control spread is unestablished', () => {
  const point = (first, changePct) => ({first, changePct, upstreamNs: 100, vpmNs: 100 + changePct});
  const controls = [point('upstream', 3), point('vpm', -2)];
  assert.match(describe({case: 'reverse', processes: [point('upstream', -15), point('vpm', 5)], controls}).evidence, /unestablished/);
  assert.match(describe({case: 'small', processes: [point('upstream', -2), point('vpm', -3)], controls}).evidence, /unestablished/);
  assert.match(describe({case: 'large', processes: [point('upstream', -20), point('vpm', -18)], controls}).evidence, /lower time/);
});

test('near-zero summary values round-trip through stored JSON', () => {
  const points = ['upstream', 'vpm'].map(first => ({first, upstreamNs: 100, vpmNs: 99.999, changePct: -0.001}));
  const summary = describe({case: 'near zero', processes: points, controls: points});
  assert.deepEqual(summary, JSON.parse(JSON.stringify(summary)));
});
