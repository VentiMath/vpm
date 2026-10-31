'use strict';
// Drives the Firestore operations VentiMath-style backends use against a local
// gRPC Firestore server with an in-memory store, directly and through Firebase
// Admin 14.5.0 (pinned in the jwks fixture). The server records every request
// (method, decoded request, routing and resource headers). The original
// Firestore 9.4.0 and vgoogle-cloud-firestore run in separate processes and
// must produce identical server logs and identical results.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
const fixture = path.join(__dirname, 'node_modules');
const admin = path.resolve(__dirname, '../jwks-conformance/node_modules');
const targets = {
  upstream: path.join(fixture, '@google-cloud/firestore'),
  vpm: path.resolve(__dirname, '../../packages/vgoogle-cloud-firestore'),
};

function startServer() {
  const grpc = require(path.join(fixture, '@grpc/grpc-js'));
  const loader = require(path.join(fixture, '@grpc/proto-loader'));
  const json = require(path.resolve(__dirname, '../../packages/vgoogle-cloud-firestore-api/protos/protos.json'));
  const definitions = loader.fromJSON(json, {longs: String, enums: String, defaults: false, oneofs: true, bytes: Buffer});
  const log = [], store = new Map();
  let clock = 1000;
  const now = () => ({seconds: String(++clock), nanos: 0});
  const plain = value => JSON.parse(JSON.stringify(value ?? null, (key, item) => item?.type === 'Buffer' ? Buffer.from(item.data).toString('base64') : item));
  const record = (method, call, request = call.request) => {
    const metadata = call.metadata.getMap();
    log.push({method, request: plain(request), routing: metadata['x-goog-request-params'] ?? null, resource: metadata['google-cloud-resource-prefix'] ?? null});
  };
  const read = name => store.get(name);
  function apply(write, commitTime) {
    if (write.delete) { store.delete(write.delete); return {}; }
    const name = write.update?.name ?? write.transform?.document;
    const existing = read(name);
    if (write.currentDocument?.exists === false && existing) throw Object.assign(new Error('already exists'), {code: grpc.status.ALREADY_EXISTS});
    if (write.currentDocument?.exists === true && !existing) throw Object.assign(new Error('no document to update'), {code: grpc.status.NOT_FOUND});
    let fields = existing ? structuredClone(existing.fields) : {};
    if (write.update) {
      if (write.updateMask) {
        for (const fieldPath of write.updateMask.fieldPaths ?? []) {
          const parts = fieldPath.split('.').map(part => part.replace(/^`|`$/g, ''));
          let source = write.update.fields, target = fields;
          for (const part of parts.slice(0, -1)) {
            source = source?.[part]?.mapValue?.fields;
            target = (target[part] ??= {mapValue: {fields: {}}}).mapValue.fields;
          }
          const last = parts.at(-1);
          if (source && last in source) target[last] = source[last]; else delete target[last];
        }
      } else fields = structuredClone(write.update.fields ?? {});
    }
    const transformResults = [];
    for (const transform of write.updateTransforms ?? []) {
      const current = fields[transform.fieldPath];
      let value;
      if (transform.setToServerValue) value = {timestampValue: commitTime};
      else if (transform.increment) value = {integerValue: String(Number(current?.integerValue ?? 0) + Number(transform.increment.integerValue))};
      else if (transform.appendMissingElements) {
        const values = current?.arrayValue?.values ?? [];
        for (const element of transform.appendMissingElements.values ?? []) if (!values.some(v => JSON.stringify(v) === JSON.stringify(element))) values.push(element);
        value = {arrayValue: {values}};
      } else if (transform.removeAllFromArray) {
        const remove = (transform.removeAllFromArray.values ?? []).map(v => JSON.stringify(v));
        value = {arrayValue: {values: (current?.arrayValue?.values ?? []).filter(v => !remove.includes(JSON.stringify(v)))}};
      }
      fields[transform.fieldPath] = value;
      transformResults.push(value);
    }
    store.set(name, {name, fields, createTime: existing?.createTime ?? commitTime, updateTime: commitTime});
    return {updateTime: commitTime, transformResults};
  }
  function query(request) {
    const {structuredQuery: q} = request;
    const collection = request.parent + '/' + q.from[0].collectionId + '/';
    let docs = [...store.values()].filter(d => d.name.startsWith(collection) && !d.name.slice(collection.length).includes('/'));
    const value = v => v.integerValue !== undefined ? Number(v.integerValue) : v.doubleValue ?? v.stringValue ?? v.booleanValue;
    const filters = q.where ? (q.where.compositeFilter?.filters ?? [q.where]) : [];
    for (const {fieldFilter: f} of filters) {
      const operators = {EQUAL: (a, b) => a === b, GREATER_THAN: (a, b) => a > b, LESS_THAN: (a, b) => a < b, GREATER_THAN_OR_EQUAL: (a, b) => a >= b};
      docs = docs.filter(d => d.fields[f.field.fieldPath] && operators[f.op](value(d.fields[f.field.fieldPath]), value(f.value)));
    }
    for (const order of [...(q.orderBy ?? [])].reverse()) {
      const key = d => order.field.fieldPath === '__name__' ? d.name : value(d.fields[order.field.fieldPath]);
      docs.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) * (order.direction === 'DESCENDING' ? -1 : 1));
    }
    if (q.limit) docs = docs.slice(0, q.limit.value ?? q.limit);
    return docs;
  }
  let transactions = 0;
  const server = new grpc.Server();
  server.addService(definitions['google.firestore.v1.Firestore'], {
    commit(call, done) {
      record('commit', call);
      const commitTime = now();
      try { done(null, {commitTime, writeResults: call.request.writes.map(write => apply(write, commitTime))}); } catch (error) { done(error); }
    },
    batchGetDocuments(call) {
      record('batchGetDocuments', call);
      const readTime = now();
      const transaction = call.request.newTransaction ? Buffer.from('tx' + ++transactions) : undefined;
      call.request.documents.forEach((name, i) => {
        const document = read(name);
        call.write({...(document ? {found: document} : {missing: name}), readTime, ...(i === 0 && transaction ? {transaction} : {})});
      });
      call.end();
    },
    beginTransaction(call, done) { record('beginTransaction', call); done(null, {transaction: Buffer.from('tx' + ++transactions)}); },
    rollback(call, done) { record('rollback', call); done(null, {}); },
    runQuery(call) {
      record('runQuery', call);
      const readTime = now();
      const transaction = call.request.newTransaction ? Buffer.from('tx' + ++transactions) : undefined;
      const docs = query(call.request);
      if (!docs.length) call.write({readTime, ...(transaction ? {transaction} : {})});
      docs.forEach((document, i) => call.write({document, readTime, ...(i === 0 && transaction ? {transaction} : {})}));
      call.end();
    },
    runAggregationQuery(call) {
      record('runAggregationQuery', call);
      const {structuredAggregationQuery: a} = call.request;
      const docs = query({parent: call.request.parent, structuredQuery: a.structuredQuery});
      const aggregateFields = {};
      for (const aggregation of a.aggregations) {
        if (aggregation.count) aggregateFields[aggregation.alias] = {integerValue: String(docs.length)};
        if (aggregation.sum) aggregateFields[aggregation.alias] = {integerValue: String(docs.reduce((s, d) => s + Number(d.fields[aggregation.sum.field.fieldPath]?.integerValue ?? 0), 0))};
      }
      call.write({result: {aggregateFields}, readTime: now()});
      call.end();
    },
    batchWrite(call, done) {
      record('batchWrite', call);
      const commitTime = now();
      done(null, {writeResults: call.request.writes.map(write => apply(write, commitTime)), status: call.request.writes.map(() => ({code: 0}))});
    },
    listCollectionIds(call, done) { record('listCollectionIds', call); done(null, {collectionIds: ['users', 'rooms']}); },
    listen(call) {
      call.on('data', request => {
        record('listen', call, request);
        if (!request.addTarget) return;
        const targetId = request.addTarget.targetId;
        const q = request.addTarget.query;
        call.write({targetChange: {targetChangeType: 'ADD', targetIds: [targetId]}});
        for (const document of query(q)) call.write({documentChange: {document, targetIds: [targetId]}});
        call.write({targetChange: {targetChangeType: 'CURRENT', targetIds: [targetId], resumeToken: Buffer.from('r1')}});
        call.write({targetChange: {targetChangeType: 'NO_CHANGE', targetIds: [], readTime: now(), resumeToken: Buffer.from('r1')}});
      });
      call.on('end', () => call.end());
      call.on('error', () => {});
    },
  });
  return new Promise((resolve, reject) => server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (error, port) => error ? reject(error) : resolve({port, log, close: () => server.forceShutdown()})));
}

// One scenario, written against the public Firestore API.
async function scenario(db, F) {
  const out = {};
  const value = v => {
    if (v instanceof F.Timestamp) return {timestamp: [v.seconds, v.nanoseconds]};
    if (v instanceof F.GeoPoint) return {geo: [v.latitude, v.longitude]};
    if (v instanceof F.DocumentReference) return {ref: v.path};
    if (Buffer.isBuffer(v) || v instanceof Uint8Array) return {bytes: Buffer.from(v).toString('base64')};
    if (Array.isArray(v)) return v.map(value);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).sort().map(([k, x]) => [k, value(x)]));
    return v;
  };
  const snap = s => ({path: s.ref.path, exists: s.exists, data: value(s.data() ?? null), create: s.createTime && value(s.createTime), update: s.updateTime && value(s.updateTime)});
  const users = db.collection('users');
  const ada = users.doc('ada');
  out.set = value(await ada.set({name: 'Ada', score: 3, tags: ['a'], joined: new F.Timestamp(1700000000, 5), location: new F.GeoPoint(51.5, -0.12),
    avatar: Buffer.from([1, 2, 3]), profile: {city: 'London', nested: {x: 1}}, missing: null}));
  out.merge = value(await ada.set({profile: {city: 'Paris'}, seen: F.FieldValue.serverTimestamp(), score: F.FieldValue.increment(2)}, {merge: true}));
  out.update = value(await ada.update({tags: F.FieldValue.arrayUnion('b', 'c'), 'profile.nested.x': 2, missing: F.FieldValue.delete()}));
  out.updateRemove = value(await ada.update('tags', F.FieldValue.arrayRemove('a'), 'friend', users.doc('grace')));
  out.create = value(await users.doc('grace').create({name: 'Grace', score: 7}));
  out.createExisting = await users.doc('grace').create({name: 'x'}).then(() => 'created', error => ({code: error.code}));
  out.get = snap(await ada.get());
  out.getMissing = snap(await users.doc('nobody').get());
  out.getAll = (await db.getAll(ada, users.doc('grace'), users.doc('nobody'), {fieldMask: ['name']})).map(snap);
  const batch = db.batch();
  batch.set(users.doc('linus'), {name: 'Linus', score: 5});
  batch.update(users.doc('grace'), {score: F.FieldValue.increment(1)});
  batch.delete(users.doc('nobody'));
  out.batch = (await batch.commit()).map(value);
  out.query = (await users.where('score', '>', 4).orderBy('score', 'desc').limit(5).get()).docs.map(snap);
  out.compound = (await users.where(F.Filter.and(F.Filter.where('score', '>=', 5), F.Filter.where('name', '==', 'Linus'))).get()).docs.map(d => d.id);
  out.count = (await users.count().get()).data().count;
  out.sum = (await users.aggregate({total: F.AggregateField.sum('score')}).get()).data().total;
  out.stream = await new Promise((resolve, reject) => { const ids = []; users.orderBy('name').stream().on('data', d => ids.push(d.id)).on('error', reject).on('end', () => resolve(ids)); });
  out.transaction = await db.runTransaction(async transaction => {
    const current = await transaction.get(ada);
    transaction.update(ada, {score: current.get('score') + 10});
    transaction.set(users.doc('margaret'), {name: 'Margaret', score: 1});
    return current.get('score');
  });
  out.readOnly = await db.runTransaction(async transaction => (await transaction.getAll(ada, users.doc('grace'))).map(s => s.get('score')), {readOnly: true});
  out.afterTransaction = snap(await ada.get());
  out.listen = await new Promise((resolve, reject) => {
    const unsubscribe = users.where('score', '>', 4).onSnapshot(s => { unsubscribe(); resolve({size: s.size, ids: s.docs.map(d => d.id).sort(), changes: s.docChanges().map(c => [c.type, c.doc.id, c.newIndex])}); }, reject);
  });
  out.collections = (await db.listCollections()).map(c => c.id);
  out.bulk = await (async () => { const writer = db.bulkWriter(); const results = [writer.set(users.doc('bulk1'), {n: 1}), writer.update(ada, {bulk: true}), writer.delete(users.doc('bulk1'))]; await writer.close(); return (await Promise.all(results)).map(r => r.writeTime instanceof F.Timestamp); })();
  out.delete = value(await users.doc('margaret').delete());
  out.deleteExisting = await users.doc('margaret').delete({exists: true}).then(() => 'deleted', error => ({code: error.code}));
  return out;
}

async function child(library, mode) {
  const server = await startServer();
  let db, F, cleanup;
  try {
    if (mode === 'admin') {
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + server.port;
      const {createRequire} = require('node:module');
      const adminRequire = createRequire(path.join(admin, 'firebase-admin/package.json'));
      const entry = adminRequire.resolve('@google-cloud/firestore');
      if (library === 'vpm') { require(entry); require.cache[entry].exports = require(targets.vpm); }
      const {initializeApp, deleteApp} = adminRequire('firebase-admin/app');
      const firestore = adminRequire('firebase-admin/firestore');
      const app = initializeApp({projectId: 'p'}, 'wire');
      db = firestore.getFirestore(app);
      F = {...require(library === 'vpm' ? targets.vpm : entry), ...firestore};
      assert.equal(firestore.FieldValue, require(library === 'vpm' ? targets.vpm : entry).FieldValue, 'Admin re-exports the substituted Firestore');
      cleanup = () => deleteApp(app);
    } else {
      F = require(targets[library]);
      db = new F.Firestore({projectId: 'p', host: '127.0.0.1:' + server.port, ssl: false});
      cleanup = () => db.terminate();
    }
    const results = await scenario(db, F);
    await cleanup();
    return {log: server.log, results};
  } finally {
    server.close();
  }
}

module.exports = {startServer, scenario};
if (require.main !== module) {
  // Used by other fixtures (firebase-admin-conformance/callers.cjs).
} else if (process.argv[2] === '--child') {
  child(process.argv[3], process.argv[4]).then(result => process.stdout.write(JSON.stringify(result), () => process.exit()), error => { console.error(error); process.exit(1); });
} else {
  const summary = [];
  for (const mode of ['direct', 'admin']) {
    const outputs = {};
    for (const library of ['upstream', 'vpm']) {
      const result = spawnSync(process.execPath, [__filename, '--child', library, mode], {encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024});
      assert.equal(result.status, 0, library + ' ' + mode + '\n' + result.stderr.slice(-4000));
      outputs[library] = JSON.parse(result.stdout);
    }
    assert.deepEqual(outputs.vpm.results, outputs.upstream.results, mode + ' results');
    assert.deepEqual(outputs.vpm.log, outputs.upstream.log, mode + ' server log');
    const methods = new Set(outputs.vpm.log.map(entry => entry.method));
    summary.push(`${mode === 'admin' ? 'through Firebase Admin 14.5.0' : 'direct'}: ${outputs.vpm.log.length} requests over ${methods.size} RPCs, ${Object.keys(outputs.vpm.results).length} results`);
  }
  console.log('Firestore wire check, identical to 9.4.0: ' + summary.join('; ') + '.');
}
