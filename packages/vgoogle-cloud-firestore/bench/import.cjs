'use strict';
// Cold start in fresh processes, alternating libraries: importing Firestore,
// then constructing a client and encoding a document (no network).
const path = require('node:path'), {spawnSync} = require('node:child_process');
const libraries = {
  upstream: path.resolve(__dirname, '../../../scripts/firestore-conformance/node_modules/@google-cloud/firestore'),
  vpm: path.resolve(__dirname, '..'),
};
const source = library => `
  const start = performance.now();
  const {Firestore, Timestamp} = require(${JSON.stringify(library)});
  const imported = performance.now();
  const modules = Object.keys(require.cache).length;
  const db = new Firestore({projectId: 'p'});
  db._serializer.encodeFields({name: 'Ada', joined: Timestamp.now(), ref: db.doc('users/ada')});
  process.stdout.write(JSON.stringify({imported: imported - start, ready: performance.now() - start, modules}));`;
const runs = Number(process.env.RUNS || 15), results = {upstream: [], vpm: []};
for (let i = 0; i < runs; i++) {
  for (const name of i % 2 ? ['vpm', 'upstream'] : ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, ['-e', source(libraries[name])], {encoding: 'utf8'});
    if (child.status !== 0) throw new Error(child.stderr);
    results[name].push(JSON.parse(child.stdout));
  }
}
const median = values => { const sorted = values.slice().sort((a, b) => a - b); return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2; };
console.log(`${process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.versions.node}, ${runs} processes each`);
console.table(Object.fromEntries(Object.entries(results).map(([name, rows]) => [name, {
  import_ms: median(rows.map(r => r.imported)).toFixed(1), import_client_encode_ms: median(rows.map(r => r.ready)).toFixed(1), modules_after_import: rows[0].modules}])));
