'use strict';
// Drives every call shape of the Firestore and Firestore Admin clients against a
// local gRPC server and records what the server receives: method, decoded
// request, routing header and the library-normalized x-goog-api-client header.
// The original 0.7.1 client on google-gax 6.14.0 and vgoogle-cloud-firestore-api
// on vgoogle-gax must produce identical logs and identical results.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');

function scenario(library) {
  const fixture = __dirname;
  const grpc = require(path.join(fixture, 'node_modules/@grpc/grpc-js'));
  const loader = require(path.join(fixture, 'node_modules/@grpc/proto-loader'));
  const json = require(path.join(fixture, 'node_modules/@google-cloud/firestore-api/build/protos/protos.json'));
  const api = library === 'upstream' ? require(path.join(fixture, 'node_modules/@google-cloud/firestore-api')) : require(path.resolve(fixture, '../../packages/vgoogle-cloud-firestore-api'));
  const gax = library === 'upstream' ? require(path.join(fixture, 'node_modules/google-gax')) : require(path.resolve(fixture, '../../packages/vgoogle-gax'));
  const definitions = loader.fromJSON(json, {longs: String, enums: String, defaults: false, oneofs: true, bytes: Buffer});
  const log = [];
  const record = (method, call) => {
    const metadata = call.metadata.getMap();
    const client = String(metadata['x-goog-api-client'] ?? '').split(' ').map(token => token.replace(/\/.*$/, '/*')).join(' ');
    log.push({method, request: JSON.parse(JSON.stringify(call.request ?? null)), routing: metadata['x-goog-request-params'] ?? null, client});
  };
  const database = 'projects/p/databases/(default)', parent = database + '/documents';
  const document = name => ({name: parent + '/' + name, fields: {n: {integerValue: '1'}}, createTime: {seconds: '1'}, updateTime: {seconds: '2'}});
  const server = new grpc.Server();
  const firestore = {
    getDocument(call, done) { record('getDocument', call); done(null, document('a')); },
    commit(call, done) { record('commit', call); done(null, {commitTime: {seconds: '3'}, writeResults: call.request.writes.map(() => ({updateTime: {seconds: '3'}}))}); },
    updateDocument(call, done) { record('updateDocument', call); done(null, call.request.document); },
    createDocument(call, done) { record('createDocument', call); done(null, {...call.request.document, name: call.request.parent + '/' + call.request.collectionId + '/' + call.request.documentId}); },
    deleteDocument(call, done) { record('deleteDocument', call); done(null, {}); },
    beginTransaction(call, done) { record('beginTransaction', call); done(null, {transaction: Buffer.from('tx')}); },
    rollback(call, done) { record('rollback', call); done(null, {}); },
    batchWrite(call, done) { record('batchWrite', call); done(null, {writeResults: [], status: []}); },
    batchGetDocuments(call) { record('batchGetDocuments', call); for (const name of call.request.documents) call.write({found: {...document('x'), name}, readTime: {seconds: '4'}}); call.end(); },
    runQuery(call) { record('runQuery', call); call.write({document: document('a'), readTime: {seconds: '5'}}); call.write({readTime: {seconds: '5'}, done: true}); call.end(); },
    runAggregationQuery(call) { record('runAggregationQuery', call); call.write({result: {aggregateFields: {count: {integerValue: '2'}}}, readTime: {seconds: '6'}}); call.end(); },
    executePipeline(call) { record('executePipeline', call); call.end(); },
    partitionQuery(call, done) { record('partitionQuery', call); done(null, {partitions: [], nextPageToken: ''}); },
    listDocuments(call, done) {
      record('listDocuments', call);
      const page = call.request.pageToken === 'two' ? {documents: [document('c')]} : {documents: [document('a'), document('b')], nextPageToken: 'two'};
      done(null, page);
    },
    listCollectionIds(call, done) { record('listCollectionIds', call); done(null, {collectionIds: ['c1', 'c2']}); },
    write(call) {
      call.on('data', request => { log.push({method: 'write', request: JSON.parse(JSON.stringify(request))}); call.write({streamId: 's', streamToken: Buffer.from([1])}); });
      call.on('end', () => call.end());
    },
    listen(call) {
      call.on('data', request => { log.push({method: 'listen', request: JSON.parse(JSON.stringify(request))}); call.write({targetChange: {targetChangeType: 'ADD', targetIds: [1]}}); });
      call.on('end', () => call.end());
    },
  };
  const operation = {name: database + '/operations/op1', done: true, response: {type_url: 'type.googleapis.com/google.firestore.admin.v1.Index', value: Buffer.alloc(0)}};
  const admin = {
    getIndex(call, done) { record('getIndex', call); done(null, {name: call.request.name, queryScope: 'COLLECTION'}); },
    createIndex(call, done) { record('createIndex', call); done(null, operation); },
    listIndexes(call, done) { record('listIndexes', call); done(null, call.request.pageToken ? {indexes: [{name: 'i3'}]} : {indexes: [{name: 'i1'}, {name: 'i2'}], nextPageToken: 'p2'}); },
    updateBackupSchedule(call, done) { record('updateBackupSchedule', call); done(null, call.request.backupSchedule); },
    cloneDatabase(call, done) { record('cloneDatabase', call); done(null, {...operation, response: {type_url: 'type.googleapis.com/google.firestore.admin.v1.Database', value: Buffer.alloc(0)}}); },
    getField(call, done) { record('getField', call); done({code: grpc.status.NOT_FOUND, details: 'no such field'}); },
  };
  const operations = {
    getOperation(call, done) { record('getOperation', call); done(null, operation); },
    listOperations(call, done) { record('listOperations', call); done(null, {operations: [operation]}); },
  };
  server.addService(definitions['google.firestore.v1.Firestore'], firestore);
  server.addService(definitions['google.firestore.admin.v1.FirestoreAdmin'], admin);
  server.addService(definitions['google.longrunning.Operations'], operations);
  return new Promise((resolve, reject) => server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), async (error, port) => {
    if (error) return reject(error);
    const options = {servicePath: '127.0.0.1', port, sslCreds: gax.grpc.credentials.createInsecure(), projectId: 'p',
      auth: {getUniverseDomain: async () => 'googleapis.com', getProjectId: async () => 'p'}};
    const client = new api.v1.FirestoreClient(options, gax), adminClient = new api.v1.FirestoreAdminClient(options, gax);
    const settings = {timeout: 5000, retry: null};
    const collect = stream => new Promise((done, fail) => { const items = []; stream.on('data', item => items.push(item)); stream.on('end', () => done(items)); stream.on('error', fail); });
    const plain = value => JSON.parse(JSON.stringify(value));
    const out = {};
    try {
      out.getDocument = plain((await client.getDocument({name: parent + '/c/a'}, settings))[0]);
      out.commit = plain((await client.commit({database, writes: [{update: document('c/a')}, {delete: parent + '/c/b'}]}, settings))[0]);
      out.updateDocument = plain((await client.updateDocument({document: document('c/a'), updateMask: {fieldPaths: ['n']}}, settings))[0]);
      out.createDocument = plain((await client.createDocument({parent, collectionId: 'c', documentId: 'z', document: {fields: {}}}, settings))[0]);
      await client.deleteDocument({name: parent + '/c/z'}, settings);
      out.beginTransaction = plain((await client.beginTransaction({database}, settings))[0]);
      await client.rollback({database, transaction: Buffer.from('tx')}, settings);
      await client.batchWrite({database, writes: []}, settings);
      out.batchGetDocuments = plain(await collect(client.batchGetDocuments({database, documents: [parent + '/c/a', parent + '/c/b']}, settings)));
      out.runQuery = plain(await collect(client.runQuery({parent, structuredQuery: {from: [{collectionId: 'c'}], limit: {value: 3}}}, settings)));
      out.runAggregationQuery = plain(await collect(client.runAggregationQuery({parent, structuredAggregationQuery: {structuredQuery: {from: [{collectionId: 'c'}]}, aggregations: [{alias: 'count', count: {}}]}}, settings)));
      out.executePipeline = plain(await collect(client.executePipeline({database: database + '/extra'}, settings)));
      out.listDocuments = plain((await client.listDocuments({parent, collectionId: 'c', pageSize: 2}, settings))[0]);
      const iterated = [];
      for await (const item of client.listDocumentsAsync({parent, collectionId: 'c', pageSize: 2}, settings)) iterated.push(item.name);
      out.listDocumentsAsync = iterated;
      out.listDocumentsStream = plain(await collect(client.listDocumentsStream({parent, collectionId: 'c', pageSize: 2}, settings))).map(d => d.name);
      out.listCollectionIds = (await client.listCollectionIds({parent}, settings))[0];
      out.partitionQuery = plain((await client.partitionQuery({parent, partitionCount: 2}, settings))[0]);
      for (const name of ['write', 'listen']) {
        const stream = client[name]({timeout: 5000});
        const received = collect(stream);
        stream.write(name === 'write' ? {database, writes: []} : {database, addTarget: {targetId: 1, query: {parent, structuredQuery: {from: [{collectionId: 'c'}]}}}});
        stream.end();
        out[name] = plain(await received);
      }
      out.getIndex = plain((await adminClient.getIndex({name: database + '/collectionGroups/c/indexes/i'}, settings))[0]);
      const [createOperation] = await adminClient.createIndex({parent: database + '/collectionGroups/c', index: {queryScope: 'COLLECTION'}}, settings);
      out.createIndex = {name: createOperation.name, done: createOperation.done, result: plain(await createOperation.promise())[0]};
      const checked = await adminClient.checkCreateIndexProgress(createOperation.name);
      out.checkCreateIndexProgress = {name: checked.name, done: checked.done};
      out.listIndexes = plain((await adminClient.listIndexes({parent: database + '/collectionGroups/c'}, settings))[0]).map(i => i.name);
      out.updateBackupSchedule = plain((await adminClient.updateBackupSchedule({backupSchedule: {name: database + '/backupSchedules/b'}}, settings))[0]);
      const [clone] = await adminClient.cloneDatabase({parent: 'projects/p', databaseId: 'copy', pitrSnapshot: {database: 'projects/source/databases/orig'}}, settings);
      out.cloneDatabase = clone.name;
      out.getOperation = plain((await adminClient.getOperation({name: operation.name}))[0]).name;
      try { await adminClient.getField({name: database + '/collectionGroups/c/fields/f'}, settings); } catch (failure) { out.getField = {code: failure.code, details: failure.details, message: failure.message}; }
      out.paths = [adminClient.indexPath('p', 'd', 'c', 'i'), adminClient.matchCollectionFromIndexName('projects/p/databases/d/collectionGroups/c/indexes/i'), adminClient.userCredsPath('p', 'd', 'u')];
    } finally {
      await client.close(); await adminClient.close(); server.forceShutdown();
    }
    resolve({log, out});
  }));
}

if (process.argv[2] === '--child') {
  scenario(process.argv[3]).then(result => process.stdout.write(JSON.stringify(result)), error => { console.error(error); process.exitCode = 1; });
} else {
  const results = {};
  for (const library of ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, [__filename, '--child', library], {encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024});
    assert.equal(child.status, 0, library + '\n' + child.stderr);
    results[library] = JSON.parse(child.stdout);
  }
  assert.deepEqual(results.vpm.out, results.upstream.out);
  assert.deepEqual(results.vpm.log, results.upstream.log);
  const methods = new Set(results.vpm.log.map(entry => entry.method));
  assert.ok(methods.size >= 24, [...methods].join(' '));
  console.log(`Firestore API wire check: ${results.vpm.log.length} server-received requests across ${methods.size} RPCs and ${Object.keys(results.vpm.out).length} client results identical to 0.7.1 on google-gax 6.14.0.`);
}
