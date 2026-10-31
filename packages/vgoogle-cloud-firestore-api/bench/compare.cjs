'use strict';
// Per-call client overhead over an in-process transport, each library on its
// own default gax stack: upstream 0.7.1 on google-gax 6.14.0, VPM on vgoogle-gax.
const assert = require('node:assert/strict'), path = require('node:path');
const fixture = path.resolve(__dirname, '../../../scripts/firestore-api-conformance/node_modules');
const upstream = require(path.join(fixture, '@google-cloud/firestore-api'));
const vpm = require('..');
const {PassThrough} = require('node:stream');
const database = 'projects/p/databases/(default)', parent = database + '/documents';
const document = i => ({name: parent + '/items/' + i, fields: {n: {integerValue: String(i)}}, createTime: {seconds: 1}, updateTime: {seconds: 2}});
// Unary results arrive on a later microtask, as from a real channel.
function transport() {
  const unary = respond => (request, metadata, options, callback) => { queueMicrotask(() => callback(null, respond(request))); return {cancel() {}}; };
  return {
    close() {},
    getDocument: unary(request => document(1)),
    listDocuments: unary(request => request.pageToken ? {documents: [3, 4, 5].map(document)} : {documents: [0, 1, 2].map(document), nextPageToken: 'next'}),
    runQuery(request) {
      const stream = new PassThrough({objectMode: true});
      queueMicrotask(() => {
        stream.emit('metadata', {});
        for (let i = 0; i < 10; i++) stream.write({document: document(i), readTime: {seconds: 3}});
        stream.end();
        stream.emit('status', {code: 0, details: '', metadata: {}});
      });
      stream.cancel = () => {};
      return stream;
    },
  };
}
const options = {projectId: 'p', auth: {getUniverseDomain: async () => 'googleapis.com', getProjectId: async () => 'p'}};
const json = require('../protos/protos.json');
const env = {transport, options, parent, database, json};
// Each variant gets freshly compiled case code (see docs/DEVELOPMENT.md).
const prelude = 'const {transport, options, parent, database} = env;\n' +
  'const connected = () => { const client = new lib.v1.FirestoreClient(options); client._gaxGrpc.createStub = async () => transport(); return client; };\n';
const compiled = body => async lib => new Function('lib', 'env', prelude + body)(lib, env);
const cases = [
  {name: 'construct / FirestoreClient', make: compiled('return () => new lib.v1.FirestoreClient(options).apiEndpoint;'), validate: v => assert.equal(v, 'firestore.googleapis.com')},
  {name: 'construct / FirestoreAdminClient with operations', make: compiled('return () => new lib.v1.FirestoreAdminClient(options).universeDomain;'), validate: v => assert.equal(v, 'googleapis.com')},
  {name: 'unary / getDocument', async: true, make: compiled('const client = connected(); const request = {name: parent + "/items/1"}; return async () => (await client.getDocument(request))[0].name;'), validate: v => assert.equal(v, parent + '/items/1')},
  {name: 'paged / listDocuments, 2 pages', async: true, make: compiled('const client = connected(); return async () => (await client.listDocuments({parent, collectionId: "items"}))[0].length;'), validate: v => assert.equal(v, 6)},
  {name: 'server stream / runQuery, 10 results', async: true, make: compiled('const client = connected(); return () => new Promise((resolve, reject) => { let n = 0; client.runQuery({parent, structuredQuery: {}}).on("data", () => { n++; }).on("error", reject).on("end", () => resolve(n)); });'), validate: v => assert.equal(v, 10)},
  // Upstream parses the 300 KB proto JSON again on every error with details.
  {name: 'error / status detail decoding', async: true, make: compiled(`
    const client = new lib.v1.FirestoreAdminClient(options);
    client.initialize = () => Promise.resolve();
    const root = client._gaxModule.protobuf.Root.fromJSON(env.json);
    const Any = root.lookupType('google.protobuf.Any'), Index = root.lookupType('google.firestore.admin.v1.Index');
    const value = Index.encode({name: 'idx'}).finish();
    client.innerApiCalls.getIndex = () => Promise.reject(Object.assign(new Error('failed'), {statusDetails: [Any.create({type_url: 'type.googleapis.com/google.firestore.admin.v1.Index', value})]}));
    return async () => { try { await client.getIndex({name: 'n'}); } catch (error) { return error.statusDetails[0].name; } };`), validate: v => assert.equal(v, 'idx')},
];
require('../../../scripts/bench-paired.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases,
  files: ['package.json', 'index.js', 'lib/client.js', 'lib/services.js', 'bench/compare.cjs', '../vgoogle-gax/package.json', '../../scripts/firestore-api-conformance/package-lock.json']}).catch(e => {console.error(e); process.exitCode = 1;});
