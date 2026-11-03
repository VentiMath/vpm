'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), {spawnSync} = require('node:child_process');
const Firestore = require('..');
const upstreamEntry = path.resolve(__dirname, '../../../scripts/firestore-conformance/node_modules/@google-cloud/firestore');

test('importing loads no transport, protobuf or OpenTelemetry modules', () => {
  const child = spawnSync(process.execPath, ['-e', `
    const firestore = require(${JSON.stringify(path.resolve(__dirname, '..'))});
    const files = () => Object.keys(require.cache).map(f => f.replace(/\\\\/g, '/'));
    const at = files();
    void firestore.Timestamp.now(); void firestore.FieldValue.serverTimestamp();
    new firestore.Firestore({projectId: 'p'}).doc('a/b');
    const used = files();
    void firestore.protos.google;
    process.stdout.write(JSON.stringify({modules: at.length, heavy: at.filter(f => /\\/(?:vgoogle-gax|vprotobufjs|vopentelemetry-api)\\//.test(f)).length,
      gaxAfterUse: used.some(f => f.includes('/vgoogle-gax/build/src/index.js')), protos: files().some(f => f.endsWith('vgoogle-cloud-firestore-api/protos/protos.js'))}));`], {encoding: 'utf8'});
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.ok(result.modules < 100, String(result.modules));
  assert.equal(result.heavy, 0);
  assert.equal(result.gaxAfterUse, false, 'constructing a client and a reference does not need gax');
  assert.equal(result.protos, true);
});

test('documented root exports preserve upstream names and constructor identity', () => {
  const upstream = require(upstreamEntry);
  const names = module => Object.keys(module).filter(name => name !== 'protos').sort();
  for(const name of names(Firestore).filter(n=>!['AggregateQuery','AggregateQuerySnapshot'].includes(n)))assert(name in upstream,name);
  assert.equal(typeof Firestore, 'function');
  assert.equal(Firestore.Firestore, Firestore);
  assert.equal(Firestore.default, Firestore);
  const db = new Firestore({projectId: 'p'});
  assert.ok(db instanceof Firestore.Firestore);
  assert.equal(db.doc('users/ada').path, 'users/ada');
  assert.equal(typeof Firestore.protos.google.firestore.v1.Document, 'function');
  assert.equal(typeof Firestore.v1, 'function');
  assert.equal(typeof Firestore.v1.FirestoreClient, 'function');
  assert.equal(Firestore.GrpcStatus.ABORTED, 10);
  assert.throws(() => Firestore.v1beta1, /v1beta1 is not available/);
});

test('native ES module imports provide the named exports', async () => {
  const esm = await import('vgoogle-cloud-firestore');
  assert.equal(esm.Firestore, Firestore.Firestore);
  assert.equal(esm.default, Firestore);
  assert.equal(esm.FieldValue, Firestore.FieldValue);
  assert.equal(esm.Timestamp, Firestore.Timestamp);
});

test('reads after terminate() reject at once without unhandled rejections', async () => {
  let unhandled = 0;
  const count = () => { unhandled++; };
  process.on('unhandledRejection', count);
  try {
    const db = new Firestore({projectId: 'p', ssl: false, host: '127.0.0.1:1'});
    await db.terminate();
    const started = Date.now();
    const terminated = {message: 'The client has already been terminated'};
    await assert.rejects(db.collection('c').get(), terminated);
    await assert.rejects(db.doc('c/d').get(), terminated);
    await assert.rejects(db.collection('c').count().get(), terminated);
    await assert.rejects(new Promise((resolve, reject) => db.collection('c').onSnapshot(resolve, reject)), terminated);
    assert.ok(Date.now() - started < 1000);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(unhandled, 0);
  } finally {
    process.off('unhandledRejection', count);
  }
});

test('terminate() with an active listener rejects with an Error', async () => {
  const db = new Firestore({projectId: 'p', ssl: false, host: '127.0.0.1:1'});
  const unsubscribe = db.collection('c').onSnapshot(() => {}, () => {});
  await assert.rejects(db.terminate(), error => error instanceof Error && /There are 1 active listeners/.test(error.message));
  unsubscribe();
  await db.terminate();
});

test('failed client cleanup cannot replace a completed operation result', async () => {
  const db=new Firestore({projectId:'p'});db._clients.set('grpc',Promise.resolve({close:async()=>{throw Error('close failed')}}));await db.terminate();
});
