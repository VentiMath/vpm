'use strict';
// Cold start in fresh processes, alternating libraries: loading a functions
// codebase shaped like VentiMath's (logger from v2, HTTP, callable, scheduled,
// task-queue and Firestore-triggered functions, secrets) before any request.
const path = require('node:path'), {spawnSync} = require('node:child_process');
const roots = {
  upstream: path.resolve(__dirname, '../../../scripts/firebase-functions-conformance/node_modules/firebase-functions'),
  vpm: path.resolve(__dirname, '..'),
};
const source = root => `
  const path = require('node:path'), map = require(${JSON.stringify(path.join(root, 'package.json'))}).exports;
  const load = entry => require(path.join(${JSON.stringify(root)}, map['./' + entry].require));
  const start = performance.now();
  const {logger} = load('v2');
  const logged = performance.now();
  const {onRequest, onCall} = load('https'), {onSchedule} = load('scheduler'), {onTaskDispatched} = load('tasks');
  const {onDocumentCreated} = load('firestore'), {defineSecret} = load('params');
  const key = defineSecret('API_KEY');
  const functions = [onRequest({secrets: [key]}, (q, r) => r.send('ok')), onCall(() => ({})), onSchedule('every day 03:00', async () => {}),
    onTaskDispatched(async () => {}), onDocumentCreated('rooms/{id}', () => {})];
  void [logger, functions];
  process.stdout.write(JSON.stringify({logger: logged - start, all: performance.now() - start, modules: Object.keys(require.cache).length}));`;
const runs = Number(process.env.RUNS || 15), results = {upstream: [], vpm: []};
for (let i = 0; i < runs; i++) {
  for (const name of i % 2 ? ['vpm', 'upstream'] : ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, ['-e', source(roots[name])], {encoding: 'utf8', env: {...process.env, GCLOUD_PROJECT: 'p'}});
    if (child.status !== 0) throw new Error(child.stderr);
    results[name].push(JSON.parse(child.stdout));
  }
}
const median = values => { const sorted = values.slice().sort((a, b) => a - b); return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2; };
console.log(`${process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.versions.node}, ${runs} processes each`);
console.table(Object.fromEntries(Object.entries(results).map(([name, rows]) => [name, {
  v2_logger_ms: median(rows.map(r => r.logger)).toFixed(1), codebase_ms: median(rows.map(r => r.all)).toFixed(1), modules: rows[0].modules}])));
