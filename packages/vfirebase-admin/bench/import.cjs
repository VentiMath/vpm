'use strict';
// Cold start in fresh processes, alternating libraries: initializing an app and
// the services a Cloud Functions backend uses (no network).
const path = require('node:path'), {spawnSync} = require('node:child_process');
const roots = {
  upstream: path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/node_modules/firebase-admin'),
  vpm: path.resolve(__dirname, '..'),
};
const source = root => `
  const path = require('node:path'), exportsMap = require(${JSON.stringify(path.join(root, 'package.json'))}).exports;
  const load = entry => require(path.join(${JSON.stringify(root)}, exportsMap['./' + entry].require));
  const start = performance.now();
  const app = load('app').initializeApp({projectId: 'p'});
  load('auth').getAuth(app);
  const auth = performance.now();
  load('firestore').getFirestore(app);
  load('messaging').getMessaging(app);
  load('storage').getStorage(app);
  process.stdout.write(JSON.stringify({auth: auth - start, all: performance.now() - start, modules: Object.keys(require.cache).length}));`;
const runs = Number(process.env.RUNS || 15), results = {upstream: [], vpm: []};
for (let i = 0; i < runs; i++) {
  for (const name of i % 2 ? ['vpm', 'upstream'] : ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, ['-e', source(roots[name])], {encoding: 'utf8'});
    if (child.status !== 0) throw new Error(child.stderr);
    results[name].push(JSON.parse(child.stdout));
  }
}
const median = values => { const sorted = values.slice().sort((a, b) => a - b); return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2; };
console.log(`${process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.versions.node}, ${runs} processes each`);
console.table(Object.fromEntries(Object.entries(results).map(([name, rows]) => [name, {
  app_and_auth_ms: median(rows.map(r => r.auth)).toFixed(1), all_services_ms: median(rows.map(r => r.all)).toFixed(1), modules: rows[0].modules}])));
