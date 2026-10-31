'use strict';
// Drives the Firebase Admin APIs VentiMath's backend calls through the original
// firebase-admin 14.5.0 and vfirebase-admin, each in its own process, against
// local servers: the Auth emulator protocol (verifyIdToken with revocation
// checks, getUser, updateUser, revokeRefreshTokens, deleteUsers), Firestore over
// gRPC (the Firestore fixture's server and scenario), Cloud Storage's JSON API
// (save, exists, delete) plus v2 signed URLs, and FCM HTTP/2 sends
// (sendEachForMulticast). Server logs and results must be identical.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
const roots = {
  upstream: path.join(__dirname, 'node_modules/firebase-admin'),
  vpm: path.resolve(__dirname, '../../packages/vfirebase-admin'),
};
const {generateKeyPairSync, createHash} = require('node:crypto');
const {CRC32C} = require('../../packages/vgoogle-cloud-storage');

async function child(library) {
  const http = require('node:http'), http2 = require('node:http2');
  const log = [], fcmLog = [];
  const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
  const body = request => new Promise(resolve => { const chunks = []; request.on('data', c => chunks.push(c)); request.on('end', () => resolve(Buffer.concat(chunks).toString())); });

  // Auth emulator (identitytoolkit v1) and Cloud Storage JSON API stub.
  const users = new Map([['ada', {localId: 'ada', email: 'ada@example.com', validSince: '100', customAttributes: '{"role":"teacher"}'}],
    ['grace', {localId: 'grace', email: 'grace@example.com', validSince: '100'}]]);
  const objects = new Map();
  const api = http.createServer(async (request, response) => {
    const text = await body(request);
    const url = new URL(request.url, 'http://local');
    const json = text && request.headers['content-type']?.startsWith('application/json') ? JSON.parse(text) : null;
    const entry = {method: request.method, path: url.pathname, query: Object.fromEntries([...url.searchParams].filter(([k]) => k !== 'uploadType' || true)),
      authorization: request.headers.authorization ?? null, body: json ?? (text ? '<' + text.length + ' bytes>' : null)};
    // revokeRefreshTokens sends the current time; record it as such.
    if (json?.validSince !== undefined && Math.abs(Number(json.validSince) - Date.now() / 1000) < 120) entry.body = {...json, validSince: '<now>'};
    log.push(entry);
    const send = (status, value) => { response.writeHead(status, {'content-type': 'application/json'}); response.end(JSON.stringify(value)); };
    if (url.pathname.endsWith('/accounts:lookup')) {
      const found = (json.localId ?? []).map(id => users.get(id)).filter(Boolean);
      return send(200, found.length ? {users: found} : {});
    }
    if (url.pathname.endsWith('/accounts:update')) {
      const user = users.get(json.localId);
      if (!user) return send(400, {error: {code: 400, message: 'USER_NOT_FOUND'}});
      if (json.displayName) user.displayName = json.displayName;
      if (json.validSince) user.validSince = json.validSince;
      if (json.disableUser !== undefined) user.disabled = json.disableUser;
      return send(200, {localId: user.localId});
    }
    if (url.pathname.endsWith('/accounts:batchDelete')) {
      for (const id of json.localIds) users.delete(id);
      return send(200, {});
    }
    const objectPath = url.pathname.match(/\/b\/([^/]+)\/o(?:\/(.+))?$/);
    if (objectPath) {
      const name = objectPath[2] ? decodeURIComponent(objectPath[2]) : url.searchParams.get('name');
      if (request.method === 'POST') {
        // Multipart upload: metadata part, then the media part.
        const boundary = request.headers['content-type'].match(/boundary=([^;]+)/)[1].replace(/"/g, '');
        const media = Buffer.from(text.split('--' + boundary)[2].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''));
        objects.set(name, media);
        const crc32c = new CRC32C(); crc32c.update(media);
        return send(200, {bucket: objectPath[1], name, size: String(media.length), generation: '1',
          md5Hash: createHash('md5').update(media).digest('base64'), crc32c: crc32c.toString()});
      }
      if (request.method === 'DELETE') { const had = objects.delete(name); return had ? (response.writeHead(204), response.end()) : send(404, {error: {code: 404, message: 'No such object'}}); }
      if (objects.has(name)) return send(200, {bucket: objectPath[1], name, size: String(objects.get(name).length), generation: '1'});
      return send(404, {error: {code: 404, message: 'No such object: ' + name}});
    }
    send(404, {error: {code: 404, message: 'unexpected ' + url.pathname}});
  });
  const apiPort = await listen(api);

  // FCM v1 over HTTP/2 (cleartext locally; the SDK connects to https://fcm.googleapis.com).
  const fcm = http2.createServer();
  fcm.on('stream', (stream, headers) => {
    const chunks = [];
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => {
      const request = JSON.parse(Buffer.concat(chunks).toString());
      fcmLog.push({method: headers[':method'], path: headers[':path'], authorization: headers.authorization, body: request});
      const token = request.message.token;
      if (token === 'stale') {
        stream.respond({':status': 404, 'content-type': 'application/json'});
        stream.end(JSON.stringify({error: {code: 404, message: 'Requested entity was not found.', status: 'NOT_FOUND',
          details: [{'@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED'}]}}));
      } else {
        stream.respond({':status': 200, 'content-type': 'application/json'});
        stream.end(JSON.stringify({name: 'projects/p/messages/' + token}));
      }
    });
  });
  const fcmPort = await listen(fcm);
  const connect = http2.connect;
  http2.connect = (authority, options, listener) => {
    const session = connect('http://127.0.0.1:' + fcmPort, {...options, ALPNProtocols: undefined}, listener);
    // The original sends ':scheme: https:', which Node's HTTP/2 server rejects
    // (regressions.cjs covers that); pass the bare scheme so the rest of the
    // exchange can be compared. This is a no-op for VPM.
    const request = session.request.bind(session);
    session.request = (headers, ...rest) => request({...headers, ':scheme': String(headers[':scheme']).replace(/:$/, '')}, ...rest);
    return session;
  };

  const firestoreWire = require('../firestore-conformance/wire.cjs');
  const firestore = await firestoreWire.startServer();
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:' + apiPort;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:' + apiPort;
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:' + firestore.port;

  const root = roots[library];
  // Load each entry point through the package's own export map.
  const exportsMap = require(path.join(root, 'package.json')).exports;
  const load = entry => require(path.join(root, exportsMap['.' + entry].require));
  const {initializeApp, cert, deleteApp} = load('/app');
  const {getAuth} = load('/auth'), {getFirestore, ...F} = load('/firestore');
  const {getStorage} = load('/storage'), {getMessaging} = load('/messaging');
  const privateKey = process.env.FIXTURE_KEY;
  const app = initializeApp({projectId: 'p', storageBucket: 'p.appspot.com',
    credential: cert({projectId: 'p', clientEmail: 'admin@p.iam.gserviceaccount.com', privateKey})}, 'callers');
  const messagingApp = initializeApp({projectId: 'p', credential: {getAccessToken: async () => ({access_token: 'test-token', expires_in: 3600})}}, 'messaging');
  const out = {};
  const outcome = promise => promise.then(value => ({value}), error => ({code: error.code, message: error.message}));

  // Auth.
  const auth = getAuth(app);
  const base64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const idToken = (uid, authTime = 200) => base64({alg: 'none', typ: 'JWT'}) + '.' + base64({iss: 'https://securetoken.google.com/p', aud: 'p', sub: uid, user_id: uid,
    auth_time: authTime, iat: authTime, exp: 4102444800, firebase: {sign_in_provider: 'password'}}) + '.';
  const claims = token => token.value ? {uid: token.value.uid, aud: token.value.aud, role: token.value.role ?? null} : token;
  out.verify = claims(await outcome(auth.verifyIdToken(idToken('ada'))));
  out.verifyChecked = claims(await outcome(auth.verifyIdToken(idToken('ada'), true)));
  out.verifyMissingUser = claims(await outcome(auth.verifyIdToken(idToken('nobody'), true)));
  out.verifyBad = claims(await outcome(auth.verifyIdToken('not-a-token')));
  out.getUser = await outcome(auth.getUser('ada').then(user => ({uid: user.uid, email: user.email, claims: user.customClaims})));
  out.getMissing = await outcome(auth.getUser('nobody'));
  out.updateUser = await outcome(auth.updateUser('grace', {displayName: 'Grace H', disabled: false}).then(user => user.uid));
  out.revoke = await outcome(auth.revokeRefreshTokens('ada'));
  out.revoked = claims(await outcome(auth.verifyIdToken(idToken('ada'), true)));
  out.deleteUsers = await outcome(auth.deleteUsers(['grace', 'nobody']).then(r => [r.successCount, r.failureCount]));

  // Firestore through Admin.
  out.firestore = await firestoreWire.scenario(getFirestore(app), F);

  // Storage.
  const bucket = getStorage(app).bucket();
  const file = bucket.file('reports/term 1.pdf');
  out.save = await outcome(file.save(Buffer.from('%PDF-1.4 fixture'), {resumable: false, contentType: 'application/pdf'}));
  out.exists = await outcome(file.exists());
  out.signed = await outcome(file.getSignedUrl({version: 'v2', action: 'read', expires: 4102444800000}).then(([url]) => url.replace(/127\.0\.0\.1:\d+/, 'emulator')));
  out.delete = await outcome(file.delete().then(() => 'deleted'));
  out.existsAfter = await outcome(file.exists());

  // Messaging.
  const sent = await getMessaging(messagingApp).sendEachForMulticast({tokens: ['t1', 'stale', 't2'], notification: {title: 'Hi', body: 'Practice set ready'},
    data: {set: '42'}, apns: {payload: {aps: {badge: 1}}}});
  out.multicast = {successCount: sent.successCount, failureCount: sent.failureCount,
    responses: sent.responses.map(r => r.success ? {id: r.messageId} : {code: r.error.code, message: r.error.message})};

  await deleteApp(app); await deleteApp(messagingApp);
  http2.connect = connect;
  api.close(); fcm.close(); firestore.close();
  // Multicast messages are sent concurrently; compare them in token order.
  fcmLog.sort((a, b) => a.body.message.token.localeCompare(b.body.message.token));
  return {log: [...log, ...fcmLog], firestoreLog: firestore.log, out};
}

if (process.argv[2] === '--child') {
  child(process.argv[3]).then(result => process.stdout.write(JSON.stringify(result), () => process.exit()), error => { console.error(error); process.exit(1); });
} else {
  const {privateKey} = generateKeyPairSync('rsa', {modulusLength: 2048, privateKeyEncoding: {type: 'pkcs8', format: 'pem'}, publicKeyEncoding: {type: 'spki', format: 'pem'}});
  const results = {};
  for (const library of ['upstream', 'vpm']) {
    const child = spawnSync(process.execPath, [__filename, '--child', library], {encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024, env: {...process.env, FIXTURE_KEY: privateKey}});
    assert.equal(child.status, 0, library + '\n' + child.stderr.slice(-4000));
    results[library] = JSON.parse(child.stdout);
  }
  // The library token in x-goog-api-client differs by design; nothing else may.
  assert.deepEqual(results.vpm.out, results.upstream.out);
  assert.deepEqual(results.vpm.log, results.upstream.log);
  assert.deepEqual(results.vpm.firestoreLog, results.upstream.firestoreLog);
  const {out} = results.vpm;
  assert.equal(out.verify.uid, 'ada'); assert.equal(out.revoked.code, 'auth/id-token-revoked');
  assert.equal(out.multicast.successCount, 2); assert.deepEqual(out.save, {}); assert.equal(out.exists.value[0], true); assert.equal(out.delete.value, 'deleted'); assert.equal(out.existsAfter.value[0], false);
  console.log(`Firebase Admin callers, identical to 14.5.0: ${results.vpm.log.length} Auth, Storage and FCM requests, ${results.vpm.firestoreLog.length} Firestore RPCs and ${Object.keys(out).length} results.`);
}
