'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), {spawnSync} = require('node:child_process');
const api = require('..');
const gax = require('vgoogle-gax');

// No credentials or metadata-server lookups are needed: the transport is stubbed.
const options = {auth: {getUniverseDomain: async () => 'googleapis.com', getProjectId: async () => 'p'}, projectId: 'p'};
const database = 'projects/p/databases/(default)', parent = database + '/documents';
// A transport stub that records what each unary RPC receives.
function fakeStub(calls, respond = () => ({})) {
  return new Proxy({close() {}}, {get(target, name) {
    if (name in target || typeof name !== 'string' || name === 'then') return target[name];
    return (request, metadata, callOptions, callback) => {
      calls.push({name, request, routing: metadata.get('x-goog-request-params')[0], client: metadata.get('x-goog-api-client')[0]});
      setImmediate(() => { try { callback(null, respond(name, request)); } catch (error) { callback(error); } });
      return {cancel() {}};
    };
  }});
}
function connected(Client, calls, respond) {
  const client = new Client(options);
  client._gaxGrpc.createStub = async () => fakeStub(calls, respond);
  return client;
}

test('importing loads no transport and no static protos', () => {
  const child = spawnSync(process.execPath, ['-e', `
    const api = require(${JSON.stringify(path.resolve(__dirname, '..'))});
    const loaded = () => Object.keys(require.cache).map(f => f.replace(/\\\\/g, '/'));
    const before = loaded();
    void api.v1;
    const afterV1 = loaded();
    void api.FirestoreClient;
    const afterAccess = loaded();
    new api.FirestoreClient({projectId: 'p'});
    const afterClient = loaded();
    void api.protos;
    process.stdout.write(JSON.stringify({before: before.length, afterV1: afterV1.length,
      gax: afterAccess.some(f => f.includes('/vgoogle-gax/')), clientGax: afterClient.some(f => f.includes('/vgoogle-gax/')),
      protos: afterClient.some(f => f.endsWith('protos/protos.js')), protosAfter: loaded().some(f => f.endsWith('protos/protos.js'))}));`], {encoding: 'utf8'});
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.ok(result.before <= 5, JSON.stringify(result));
  assert.equal(result.afterV1, result.before);
  assert.equal(result.gax, false);
  assert.equal(result.clientGax, true);
  assert.equal(result.protos, false);
  assert.equal(result.protosAfter, true);
});

test('entry points match the original package', async () => {
  assert.equal(api.FirestoreClient, api.v1.FirestoreClient);
  assert.equal(api.default.FirestoreAdminClient, api.v1.FirestoreAdminClient);
  assert.equal(api.default.v1, api.v1);
  assert.equal(api.FirestoreClient.name, 'FirestoreClient');
  assert.equal(require('vgoogle-cloud-firestore-api/client_v1').FirestoreClient, api.FirestoreClient);
  assert.equal(require('vgoogle-cloud-firestore-api/admin_v1').FirestoreAdminClient, api.FirestoreAdminClient);
  assert.equal(require('vgoogle-cloud-firestore-api/build/src/v1'), api.v1);
  assert.equal(require('vgoogle-cloud-firestore-api/build/protos/protos'), api.protos);
  assert.ok(require('vgoogle-cloud-firestore-api/build/protos/protos.json').nested.google);
  assert.ok(require('vgoogle-cloud-firestore-api/v1/firestore_client_config.json').interfaces['google.firestore.v1.Firestore']);
  const esm = await import('vgoogle-cloud-firestore-api');
  assert.equal(esm.FirestoreClient, api.FirestoreClient);
  assert.equal(esm.default, api.default);
  assert.equal(esm.protos, api.protos);
  assert.equal(typeof api.protos.google.firestore.v1.Document, 'function');
});

test('client metadata matches the generated clients', () => {
  const client = new api.FirestoreClient(options);
  assert.equal(client.apiEndpoint, 'firestore.googleapis.com');
  assert.equal(client.universeDomain, 'googleapis.com');
  assert.equal(api.FirestoreClient.port, 443);
  assert.deepEqual(api.FirestoreClient.scopes, ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/datastore']);
  api.FirestoreClient.scopes.push('mutated');
  assert.equal(api.FirestoreClient.scopes.length, 2);
  assert.equal(new api.FirestoreClient({...options, universeDomain: 'example.test'}).apiEndpoint, 'firestore.example.test');
  assert.throws(() => new api.FirestoreClient({universeDomain: 'a', universe_domain: 'b'}), /either universe_domain or universeDomain/);
  assert.deepEqual(Object.keys(client.descriptors.page).sort(), ['listCollectionIds', 'listDocuments', 'partitionQuery']);
  assert.deepEqual(Object.keys(client.descriptors.stream).sort(), ['batchGetDocuments', 'executePipeline', 'listen', 'runAggregationQuery', 'runQuery', 'write']);
  const admin = new api.FirestoreAdminClient(options);
  assert.deepEqual(Object.keys(admin.descriptors.longrunning).sort(), ['bulkDeleteDocuments', 'cloneDatabase', 'createDatabase', 'createIndex', 'deleteDatabase', 'exportDocuments', 'importDocuments', 'restoreDatabase', 'updateDatabase', 'updateField']);
  assert.equal(Object.keys(admin.pathTemplates).length, 9);
});

test('unary calls carry routing and client headers without touching caller options', async () => {
  const calls = [];
  const client = connected(api.FirestoreClient, calls, (name, request) => name === 'getDocument' ? {name: request.name} : {});
  const shared = {timeout: 1000};
  const [document] = await client.getDocument({name: parent + '/c/a'}, shared);
  assert.equal(document.name, parent + '/c/a');
  await client.updateDocument({document: {name: parent + '/c/b'}}, shared);
  await client.updateDocument({}, shared);
  await client.listCollectionIds({parent}, shared);
  assert.deepEqual(shared, {timeout: 1000});
  assert.deepEqual(calls.map(call => call.routing), [
    'name=' + encodeURIComponent(parent + '/c/a'),
    'document.name=' + encodeURIComponent(parent + '/c/b'),
    'document.name=',
    'parent=' + encodeURIComponent(parent)]);
  assert.match(calls[0].client, /^gax\/\S+ gapic\/\d+\.\d+\.\d+ gl-node\/\S+ grpc\/\S+$/);
  await client.close();
});

test('regex routing captures resource segments', async () => {
  const calls = [];
  const admin = connected(api.FirestoreAdminClient, calls, () => ({name: 'operations/o', done: false}));
  await admin.cloneDatabase({parent: 'projects/p', pitrSnapshot: {database: 'projects/source/databases/orig'}});
  await admin.cloneDatabase({parent: 'projects/p'});
  assert.deepEqual(calls.map(call => call.routing), ['project_id=source&database_id=orig', '']);
  await admin.close();
});

test('callbacks receive results, and later calls on a closed client fail', async () => {
  const calls = [];
  const client = connected(api.FirestoreClient, calls, () => ({transaction: Buffer.from('tx')}));
  const response = await new Promise((resolve, reject) => client.beginTransaction({database}, (error, result) => error ? reject(error) : resolve(result)));
  assert.equal(Buffer.from(response.transaction).toString(), 'tx');
  const closing = client.close();
  // Streams opened while closing fail at once instead of after backoff retries.
  const started = Date.now();
  const early = client.runQuery({parent});
  await assert.rejects(new Promise((resolve, reject) => { early.on('error', reject); early.on('end', resolve); early.resume(); }), /already been closed/);
  assert.ok(Date.now() - started < 1000);
  await closing;
  await assert.rejects(client.getDocument({name: 'n'}), {message: 'The client has already been closed.'});
  const stream = client.runQuery({parent});
  await assert.rejects(new Promise((resolve, reject) => { stream.on('error', reject); stream.on('end', resolve); stream.resume(); }), /already been closed/);
});

test('stub and close failures reject the call instead of escaping', async () => {
  let unhandled = 0;
  const count = () => { unhandled++; };
  process.on('unhandledRejection', count);
  try {
    const client = new api.FirestoreClient(options);
    client._gaxGrpc.createStub = () => Promise.reject(new Error('stub failed'));
    await assert.rejects(client.getDocument({name: 'n'}), {message: 'stub failed'});
    const second = connected(api.FirestoreAdminClient, []);
    await second.initialize();
    second.operationsClient.close = () => Promise.reject(new Error('operations close failed'));
    await assert.rejects(second.close(), {message: 'operations close failed'});
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(unhandled, 0);
  } finally {
    process.off('unhandledRejection', count);
  }
});

test('operation helpers route by name and accept a missing request', async () => {
  const admin = new api.FirestoreAdminClient(options);
  const seen = [];
  admin.operationsClient.getOperation = (request, callOptions) => { seen.push(callOptions.otherArgs.headers['x-goog-request-params']); return Promise.resolve([{}]); };
  admin.operationsClient.deleteOperation = admin.operationsClient.getOperation;
  await admin.getOperation({name: 'operations/one'});
  await admin.getOperation(undefined);
  await admin.deleteOperation({name: 'operations/two'});
  assert.deepEqual(seen, ['name=operations%2Fone', 'name=', 'name=operations%2Ftwo']);
});

test('status details are decoded for every call shape and unknown details are kept', async () => {
  const root = gax.protobuf.Root.fromJSON(require('../protos/protos.json'));
  const Index = root.lookupType('google.firestore.admin.v1.Index');
  const Any = root.lookupType('google.protobuf.Any');
  const known = Any.create({type_url: 'type.googleapis.com/google.firestore.admin.v1.Index', value: Index.encode({name: 'idx'}).finish()});
  const unknown = Any.create({type_url: 'type.googleapis.com/example.Unknown', value: Buffer.from([1])});
  const admin = new api.FirestoreAdminClient(options);
  admin.initialize = () => Promise.resolve();
  for (const name of ['getIndex', 'createIndex', 'listIndexes']) admin.innerApiCalls[name] = () => Promise.reject(Object.assign(new Error('failed'), {statusDetails: [known, unknown]}));
  for (const call of [() => admin.getIndex({name: 'n'}), () => admin.createIndex({parent: 'p'}), () => admin.listIndexes({parent: 'p'})]) {
    await assert.rejects(call(), error => {
      assert.deepEqual(error.statusDetails.map(detail => detail.name ?? detail.type_url), ['idx', 'type.googleapis.com/example.Unknown']);
      return true;
    });
  }
});

test('path templates render and match with snake_case variables', () => {
  const admin = new api.FirestoreAdminClient(options);
  const name = admin.backupSchedulePath('p', 'd', 's');
  assert.equal(name, 'projects/p/databases/d/backupSchedules/s');
  assert.equal(admin.matchBackupScheduleFromBackupScheduleName(name), 's');
  assert.equal(admin.matchDatabaseFromBackupScheduleName(name), 'd');
  assert.equal(admin.collectionGroupPath('p', 'd', 'c'), 'projects/p/databases/d/collectionGroups/c');
  assert.equal(admin.matchUserCredsFromUserCredsName(admin.userCredsPath('p', 'd', 'u')), 'u');
  assert.throws(() => admin.indexPath('p', 'd', 'c'), {name: 'TypeError', message: 'indexPath: index is required.'});
});
