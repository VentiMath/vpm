'use strict';
// Firestore 9.4.0 keeps listener results in this tree (Watch.docTree). Drive an
// actual onSnapshot query over a local gRPC Listen stream and compare snapshots
// and change indexes. Only functional-red-black-tree is substituted.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {createRequire, isBuiltin} = require('node:module');
const from = createRequire(path.resolve(__dirname, '../protobuf-conformance/package.json'));
const gaxFixture = createRequire(path.resolve(__dirname, '../gax-conformance/package.json'));
const {firestoreSchema} = require('../gax-conformance/consumers.cjs');

function consumer(tree) {
  const cache = new Map(), stats = {imports: 0};
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const local = createRequire(file), module = {exports: {}};
    cache.set(file, module);
    function req(name) {
      if (name === 'functional-red-black-tree') {stats.imports++; return tree;}
      if (isBuiltin(name)) return local(name);
      const resolved = local.resolve(name);
      return /\/node_modules\/@google-cloud\/firestore\//.test(resolved) ? load(resolved) : local(name);
    }
    req.resolve = local.resolve;
    new Function('exports', 'require', 'module', '__filename', '__dirname', fs.readFileSync(file, 'utf8'))(module.exports, req, module, file, path.dirname(file));
    return module.exports;
  }
  return {sdk: load(from.resolve('@google-cloud/firestore')), stats};
}

const root = 'projects/tree-fixture/databases/(default)/documents/items/';
const doc = (id, n, seconds) => ({name: root + id, fields: {n: {integerValue: String(n)}}, createTime: {seconds: '1'}, updateTime: {seconds: String(seconds)}});
// Listen responses after the client's AddTarget: three documents, then a
// reorder, an insert and a delete in a second consistent snapshot.
function script(targetIds) {
  const at = seconds => ({seconds: String(seconds)});
  return [
    {targetChange: {targetChangeType: 'ADD', targetIds}},
    {documentChange: {document: doc('a', 30, 2), targetIds}},
    {documentChange: {document: doc('b', 10, 2), targetIds}},
    {documentChange: {document: doc('c', 20, 2), targetIds}},
    {targetChange: {targetChangeType: 'CURRENT', targetIds, resumeToken: Buffer.from('r1')}},
    {targetChange: {targetChangeType: 'NO_CHANGE', targetIds: [], readTime: at(3)}},
    {documentChange: {document: doc('b', 40, 4), targetIds}},
    {documentChange: {document: doc('d', 5, 4), targetIds}},
    {documentDelete: {document: root + 'c', readTime: at(4), removedTargetIds: targetIds}},
    {targetChange: {targetChangeType: 'NO_CHANGE', targetIds: [], readTime: at(5)}},
  ];
}

async function run(upstream = false) {
  const tree = require(upstream ? './node_modules/functional-red-black-tree' : '../../packages/vfunctional-red-black-tree');
  const grpc = gaxFixture('@grpc/grpc-js'), loader = gaxFixture('@grpc/proto-loader');
  const definition = loader.fromJSON(JSON.parse(fs.readFileSync(firestoreSchema, 'utf8')), {longs: String, defaults: false})['google.firestore.v1.Firestore'];
  const server = new grpc.Server();
  server.addService(definition, {listen(call) {
    call.once('data', request => { for (const message of script([request.addTarget.targetId])) call.write(message); });
    call.on('end', () => call.end());
  }});
  const port = await new Promise((resolve, reject) => server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, value) => error ? reject(error) : resolve(value)));
  const previous = process.env.FIRESTORE_EMULATOR_HOST;
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + port;
  const {sdk, stats} = consumer(tree);
  const db = new sdk.Firestore({projectId: 'tree-fixture'});
  try {
    const snapshots = [];
    const retained = [];
    await new Promise((resolve, reject) => {
      const stop = db.collection('items').orderBy('n').onSnapshot(snapshot => {
        retained.push(snapshot);
        snapshots.push({
          ids: snapshot.docs.map(d => d.id),
          changes: snapshot.docChanges().map(c => [c.type, c.doc.id, c.oldIndex, c.newIndex]),
        });
        if (snapshots.length === 2) { stop(); resolve(); }
      }, reject);
    });
    assert.equal(stats.imports, 1, 'Watch must load the selected tree');
    assert.deepEqual(snapshots, [
      {ids: ['b', 'c', 'a'], changes: [['added', 'b', -1, 0], ['added', 'c', -1, 1], ['added', 'a', -1, 2]]},
      {ids: ['d', 'a', 'b'], changes: [['removed', 'c', 1, -1], ['added', 'd', -1, 0], ['modified', 'b', 1, 2]]},
    ]);
    // The first snapshot retains its own tree after later changes.
    assert.deepEqual(retained[0].docs.map(d => [d.id, d.get('n')]), [['b', 10], ['c', 20], ['a', 30]]);
    console.log(`${upstream ? 'Upstream' : 'VPM'} tree: Firestore 9.4.0 onSnapshot ordering, add/modify/remove indexes and retained snapshots pass.`);
  } finally {
    await db.terminate().catch(() => {});
    server.forceShutdown();
    if (previous === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = previous;
  }
}
module.exports = run;
if (require.main === module) run(process.argv.includes('--upstream')).catch(error => { console.error(error); process.exitCode = 1; });
