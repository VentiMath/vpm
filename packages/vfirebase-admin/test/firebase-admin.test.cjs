'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), http = require('node:http'), http2 = require('node:http2'), {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const metadata = require('../package.json');
const load = entry => { const target = metadata.exports['.' + entry]; return require(path.join(root, typeof target === 'string' ? target : target.require)); };
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port)));

test('every original entry point resolves; Realtime Database explains its absence', () => {
  const original = require('../../../scripts/firebase-admin-conformance/node_modules/firebase-admin/package.json');
  assert.deepEqual(Object.keys(metadata.exports), Object.keys(original.exports));
  for (const entry of Object.keys(metadata.exports).filter(name => name !== './database' && name !== './package.json')) assert.equal(typeof load(entry.slice(1)), 'object', entry);
  assert.throws(() => load('/database'), /does not include the Realtime Database client/);
  assert.deepEqual(Object.keys(metadata.dependencies).sort(), ['vfast-deep-equal', 'vgoogle-auth-library', 'vjsonwebtoken', 'vjwks-rsa']);
  assert.deepEqual(Object.keys(metadata.optionalDependencies).sort(), ['vgoogle-cloud-firestore', 'vgoogle-cloud-storage']);
});

test('initializing an app loads neither Firestore, Storage nor gax', () => {
  const child = spawnSync(process.execPath, ['-e', `
    const app = require(${JSON.stringify(path.join(root, 'lib/app/index.js'))}).initializeApp({projectId: 'p'});
    require(${JSON.stringify(path.join(root, 'lib/auth/index.js'))}).getAuth(app);
    const files = Object.keys(require.cache).map(f => f.replace(/\\\\/g, '/'));
    process.stdout.write(JSON.stringify(files.filter(f => /\\/(vgoogle-cloud-firestore|vgoogle-cloud-storage|vgoogle-gax)\\//.test(f)).length));`], {encoding: 'utf8'});
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, '0');
});

test('native ES module entry points', async () => {
  const app = await import(path.join(root, metadata.exports['./app'].import));
  const firestore = await import(path.join(root, metadata.exports['./firestore'].import));
  assert.equal(typeof app.initializeApp, 'function');
  assert.equal(firestore.FieldValue, require('vgoogle-cloud-firestore').FieldValue);
  await assert.rejects(import(path.join(root, metadata.exports['./database'].import)), /Realtime Database/);
});

test('concurrent key fetches share one request', async () => {
  const {UrlKeyFetcher} = require('../lib/utils/jwt.js');
  let requests = 0;
  const server = http.createServer((request, response) => {
    requests++;
    setTimeout(() => { response.setHeader('content-type', 'application/json'); response.setHeader('cache-control', 'max-age=60'); response.end('{"k":"v"}'); }, 10);
  });
  const fetcher = new UrlKeyFetcher(await listen(server) + '/certs');
  const keys = await Promise.all(Array.from({length: 10}, () => fetcher.fetchPublicKeys()));
  assert.equal(requests, 1);
  assert.ok(keys.every(value => value.k === 'v'));
  await fetcher.fetchPublicKeys();
  assert.equal(requests, 1, 'cached until max-age');
  server.close();
});

test('a failed key fetch is retried by the next caller', async () => {
  const {UrlKeyFetcher} = require('../lib/utils/jwt.js');
  let requests = 0;
  const server = http.createServer((request, response) => {
    requests++;
    response.setHeader('content-type', 'application/json');
    if (requests === 1) { response.statusCode = 400; response.end('{"error":"invalid_request"}'); } else response.end('{"k":"v"}');
  });
  const fetcher = new UrlKeyFetcher(await listen(server) + '/certs');
  await assert.rejects(fetcher.fetchPublicKeys(), /Error fetching public keys/);
  assert.deepEqual(await fetcher.fetchPublicKeys(), {k: 'v'});
  assert.equal(requests, 2);
  server.close();
});

test('HTTP/2 requests send the bare :scheme', async () => {
  const {Http2Client, Http2SessionHandler} = require('../lib/utils/api-request.js');
  const server = http2.createServer();
  let scheme;
  server.on('stream', (stream, headers) => { scheme = headers[':scheme']; stream.respond({':status': 200, 'content-type': 'application/json'}); stream.end('{"ok":true}'); });
  const url = await listen(server);
  const session = new Http2SessionHandler(url);
  const response = await new Http2Client().send({method: 'POST', url: url + '/v1/projects/p/messages:send', data: {message: {}}, http2SessionHandler: session});
  assert.equal(response.status, 200);
  assert.deepEqual(response.data, {ok: true});
  assert.equal(scheme, 'http');
  session.close(); server.close();
});

test('multipart responses fail with a clear error', async () => {
  const {HttpClient} = require('../lib/utils/api-request.js');
  const server = http.createServer((request, response) => {
    response.setHeader('content-type', 'multipart/mixed; boundary=b');
    response.end('--b\r\ncontent-type: text/plain\r\n\r\nx\r\n--b--\r\n');
  });
  const url = await listen(server);
  await assert.rejects(new HttpClient().send({method: 'GET', url}), {code: 'app/network-error', message: /multipart response, which no Firebase Admin API reads/});
  server.close();
});
