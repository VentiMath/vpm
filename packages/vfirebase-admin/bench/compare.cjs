'use strict';
// CPU work in Firebase Admin's app, credential, token, user-management and messaging paths.
// Each worker loads only its selected SDK and dependencies.
const assert = require('node:assert/strict'), path = require('node:path');
const roots = {upstream: path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/node_modules/firebase-admin'), vpm: path.resolve(__dirname, '..')};
const library = root => ({jwt: require(path.join(root, 'lib/utils/jwt.js')), messaging: require(path.join(root, 'lib/messaging/messaging-internal.js')),
  Messaging: require(path.join(root, 'lib/messaging/messaging.js')).Messaging,
  AdminStorage: require(path.join(root, 'lib/storage/storage.js')).Storage,
  FirestoreService: require(path.join(root, 'lib/firestore/firestore-internal.js')).FirestoreService,
  getFirestoreOptions: require(path.join(root, 'lib/firestore/firestore-internal.js')).getFirestoreOptions,
  HttpClient: require(path.join(root, 'lib/utils/api-request.js')).HttpClient,
  AuthorizedHttpClient: require(path.join(root, 'lib/utils/api-request.js')).AuthorizedHttpClient,
  Http2Client: require(path.join(root, 'lib/utils/api-request.js')).Http2Client,
  Http2SessionHandler: require(path.join(root, 'lib/utils/api-request.js')).Http2SessionHandler,
  RequestClient: require(path.join(root, 'lib/utils/api-request.js')).RequestClient,
  deepCopy: require(path.join(root, 'lib/utils/deep-copy.js')).deepCopy,
  UserRecord: require(path.join(root, 'lib/auth/user-record.js')).UserRecord,
  Auth: require(path.join(root, 'lib/auth/auth.js')).Auth,
  credentialFactory: require(path.join(root, 'lib/app/credential-factory.js')),
  ApplicationDefaultCredential: require(path.join(root, 'lib/app/credential-internal.js')).ApplicationDefaultCredential,
  ...require(path.join(root, 'lib/app/firebase-app.js')), ...require(path.join(root, 'lib/app/lifecycle.js'))});
function syntheticHttp() {
  const http = require('node:http'), {EventEmitter} = require('node:events'), {PassThrough} = require('node:stream');
  http.request = (options, callback) => {
    const request = new EventEmitter();
    request.setTimeout = () => request;
    request.destroy = () => {request.destroyed = true; return request;};
    request.end = body => queueMicrotask(() => {
      const response = new PassThrough();
      response.statusCode = 200; response.headers = {'content-type': 'application/json'}; response.complete = true;
      callback(response);
      response.end(JSON.stringify({path: options.path, method: options.method, body: body.toString()}));
    });
    return request;
  };
}
function syntheticSessions() {
  const {EventEmitter} = require('node:events');
  require('node:http2').connect = () => {
    const session = new EventEmitter(); session.closed = false;
    session.close = () => {session.closed = true;};
    return session;
  };
}
function syntheticHttp2() {
  const {PassThrough} = require('node:stream');
  return {session: {request(headers) {
    const stream = new PassThrough(), end = stream.end.bind(stream);
    stream.setTimeout = () => stream;
    stream.end = body => {
      queueMicrotask(() => {
        stream.emit('response', {':status': 200, 'content-type': 'application/json'});
        end(JSON.stringify({path: headers[':path'], method: headers[':method'], body: body.toString()}));
      });
      return stream;
    };
    return stream;
  }}};
}
const {token, publicKey} = require('./token-fixture.json');
const noKid = require('./no-kid-fixture.json');
// Public test-only key already retained with the upstream conformance fixture.
const certificate = require('../../../scripts/firebase-admin-conformance/upstream/test/resources/mock.key.json');
const message = {token: 'device-token', notification: {title: 'Practice set ready', body: 'Ten problems on modular arithmetic'}, data: {set: '42', topic: 'number-theory'},
  android: {priority: 'high', notification: {channelId: 'practice', clickAction: 'OPEN_SET'}}, apns: {payload: {aps: {badge: 1, sound: 'default'}}, headers: {'apns-priority': '10'}},
  webpush: {fcmOptions: {link: 'https://example.com/sets/42'}}};
const user = {localId: 'ada', email: 'ada@example.com', emailVerified: true, displayName: 'Ada',
  phoneNumber: '+15555550100', createdAt: '1600000000000', lastLoginAt: '1700000000000', validSince: '1600000000',
  providerUserInfo: [{rawId: 'ada-google', providerId: 'google.com', email: 'ada@example.com'}],
  customAttributes: '{"role":"teacher","classes":["math","science"]}'};
const env = {token, publicKey, message, library, certificate, user, noKid, syntheticHttp, syntheticHttp2, syntheticSessions};
// A worker constructs only its selected SDK; both workers use the same fixed token.
const compiled = body => async lib => new Function('lib', 'env', 'const {token, publicKey, message, certificate, user, noKid} = env; const {jwt, messaging, Messaging, AdminStorage, FirestoreService, getFirestoreOptions, HttpClient, AuthorizedHttpClient, Http2Client, Http2SessionHandler, RequestClient, deepCopy, UserRecord, Auth, FirebaseApp, FirebaseAppInternals, AppStore, credentialFactory, ApplicationDefaultCredential} = env.library(lib);\n' + body)(lib, env);
const syntheticCredential = 'const credential = new ApplicationDefaultCredential(); const client = {credentials: {access_token: "bench", expiry_date: Date.now() + 3600000}, getAccessToken: async () => ({token: "bench"})}; credential.googleAuth.getClient = async () => client; ';
// The transport returns fixed JSON outside network I/O; these cases measure the
// complete public operation's request planning and result projection, not HTTP.
const syntheticAuth = 'const app = new FirebaseApp({projectId: "bench", credential: {getAccessToken: async () => ({access_token: "bench", expires_in: 3600})}}, "bench"); const auth = new Auth(app); ';
const verificationAuth = syntheticAuth.replace('projectId: "bench"', 'projectId: "p"') +
  'auth.idTokenVerifier.signatureVerifier.keyFetcher.fetchPublicKeys = async () => ({k1: publicKey}); ';
const syntheticMessaging = 'env.syntheticSessions(); const sender = new Messaging({options: {projectId: "bench"}}); const handler = sender.messagingRequestHandler; handler.invokeRequestHandler = async (_host, _path, data) => ({name: "messages/" + data.message.token}); handler.invokeHttpRequestHandlerForSendResponse = handler.invokeHttp2RequestHandlerForSendResponse = async (_host, _path, data) => data.message.token === "stale" ? {success: false, error: {code: "messaging/registration-token-not-registered"}} : {success: true, messageId: "messages/" + data.message.token}; ';
const cases = [
  {name: 'firestore / project client options', make: compiled('const app = new FirebaseApp({projectId: "bench", credential: new ApplicationDefaultCredential()}, "bench"); const settings = {preferRest: true}; return () => getFirestoreOptions(app, settings);'), validate: value => {assert.equal(value.projectId, 'bench'); assert.equal(value.preferRest, true);}},
  {name: 'firestore / cached database client', make: compiled('const app = new FirebaseApp({projectId: "bench", credential: new ApplicationDefaultCredential()}, "bench"); const service = new FirestoreService(app); service.getDatabase("(default)"); return () => service.getDatabase("(default)");'), validate: value => assert.equal(value.databaseId, '(default)')},
  {name: 'firestore / repeat initialized settings', make: compiled('const app = new FirebaseApp({projectId: "bench", credential: new ApplicationDefaultCredential()}, "bench"); const service = new FirestoreService(app), settings = {preferRest: true}; service.initializeDatabase("(default)", settings); return () => service.initializeDatabase("(default)", settings);'), validate: value => assert.equal(value.databaseId, '(default)')},
  {name: 'response / project JSON and consume data', make: compiled('const client = new RequestClient(null); const raw = {status: 200, headers: {"content-type": "application/json", "x-request-id": "bench", "set-cookie": ["one", "two"]}, data: JSON.stringify({users: [user]})}; return () => client.createRequestResponse(raw).data;'), validate: value => assert.equal(value.users[0].localId, 'ada')},
  {name: 'response / malformed JSON diagnostic', make: compiled('const client = new RequestClient(null); const raw = {status: 502, headers: {"content-type": "text/html"}, data: "<html>upstream failure</html>"}; return () => {const response = client.createRequestResponse(raw); try {return response.data;} catch (error) {return error;}};'), validate: value => {assert.equal(value.code, 'app/unable-to-parse-response'); assert.equal(value.httpResponse.status, 502); assert.ok(value.cause instanceof SyntaxError);}},
  {name: 'response / classify empty response', make: compiled('const client = new RequestClient(null); const raw = {status: 204, headers: {}, data: ""}; return () => client.createRequestResponse(raw).isJson();'), validate: value => assert.equal(value, false)},
  {name: 'authorization / JSON request and synthetic stream', async: true, make: compiled('env.syntheticHttp(); const client = new AuthorizedHttpClient({options: {}}); client.getToken = async () => "bench"; const config = {method: "POST", url: "http://example.test/auth", headers: {"x-goog-user-project": "bench"}, data: {value: 1}}; return () => client.send(config);'), validate: value => assert.equal(value.data.body, '{"value":1}')},
  {name: 'authorization / explicit headers and synthetic stream', async: true, make: compiled('env.syntheticHttp(); const client = new AuthorizedHttpClient({options: {}}); client.getToken = async () => "bench"; const config = {method: "POST", url: "http://example.test/auth", headers: {Authorization: "replace", "X-Goog-Api-Client": "bench", "x-goog-user-project": "bench", "X-Request-Id": "r"}, data: {value: 1}}; return () => client.send(config);'), validate: value => assert.equal(value.data.body, '{"value":1}')},
  {name: 'http2 / JSON request and synthetic stream', async: true, make: compiled('const client = new Http2Client(null), http2SessionHandler = env.syntheticHttp2(); const config = {method: "POST", url: "https://example.test/messages:send", http2SessionHandler, headers: {Authorization: "Bearer fixture", "X-Client-Version": "bench"}, data: {message: {token: "device", notification: {title: "Practice"}}}}; return () => client.send(config).then(response => response.data);'), validate: value => {assert.equal(value.path, '/messages:send'); assert.equal(JSON.parse(value.body).message.token, 'device');}},
  {name: 'http2 / twenty requests on a synthetic session', async: true, make: compiled('const client = new Http2Client(null), http2SessionHandler = env.syntheticHttp2(); const configs = Array.from({length: 20}, (_, i) => ({method: "POST", url: "https://example.test/messages:send", http2SessionHandler, headers: {Authorization: "Bearer fixture"}, data: {message: {token: "device-" + i}}})); return () => Promise.all(configs.map(config => client.send(config).then(response => response.data)));'), validate: values => {assert.equal(values.length, 20); assert.equal(JSON.parse(values[19].body).message.token, 'device-19');}},
  {name: 'http2 / create and close synthetic batch session', make: compiled('env.syntheticSessions(); return () => {const owner = new Http2SessionHandler("https://example.test"); owner.close(); return owner.isCurrentSessionClosed;};'), validate: value => assert.equal(value, true)},
  {name: 'retry / construct owned default policy', make: compiled('return () => new RequestClient();'), validate: value => assert.equal(value.retry.maxRetries, 4)},
  {name: 'retry / construct custom policy', make: compiled('const settings = {maxRetries: 3, maxDelayInMillis: 10000, statusCodes: [503], ioErrorCodes: ["ECONNRESET"], backOffFactor: 1}; return () => new RequestClient(settings);'), validate: value => assert.equal(value.retry.maxRetries, 3)},
  {name: 'retry / eligible status and backoff', make: compiled('const policy = new RequestClient(); const error = {response: {status: 503, headers: {}}}; return () => policy.getRetryDelayMillis(2, error)[0];'), validate: value => assert.equal(value, 2000)},
  {name: 'retry / Retry-After seconds', make: compiled('const policy = new RequestClient(); const error = {response: {status: 503, headers: {"retry-after": "30"}}}; return () => policy.getRetryDelayMillis(1, error)[0];'), validate: value => assert.equal(value, 30000)},
  {name: 'retry / HTTP date parsing', make: compiled('const policy = new RequestClient(); const header = "Fri, 01 Jan 2100 00:00:30 GMT"; return () => policy.parseRetryAfterIntoMillis(header);'), validate: value => assert.ok(value > 0 && Number.isFinite(value))},

  {name: 'auth / cached certificate snapshot', async: true, make: compiled('const fetcher = new jwt.UrlKeyFetcher("https://example.test/certs"); const send = HttpClient.prototype.send; HttpClient.prototype.send = async () => ({isJson: () => true, data: {k1: publicKey}, headers: {"cache-control": "max-age=3600"}}); return fetcher.fetchPublicKeys().then(() => () => fetcher.fetchPublicKeys()).finally(() => {HttpClient.prototype.send = send;});'), validate: v => assert.equal(v.k1, publicKey)},
  {name: 'auth / no-kid RSA verification with cached key', async: true, make: compiled('const verifier = new jwt.PublicKeySignatureVerifier({fetchPublicKeys: async () => ({fixture: noKid.publicKey})}); return () => verifier.verify(noKid.token).then(() => true);'), validate: v => assert.equal(v, true)},
  {name: 'auth / verify RS256 ID token signature', async: true, make: compiled('return () => jwt.verifyJwtSignature(token, publicKey, {algorithms: ["RS256"]}).then(() => true);'), validate: v => assert.equal(v, true)},
  {name: 'auth / verify ID token with cached test key', async: true, make: compiled(verificationAuth + 'return () => auth.verifyIdToken(token).then(value => value.uid);'), validate: v => assert.equal(v, 'ada')},
  {name: 'auth / verify ID token and synthetic revocation lookup', async: true, make: compiled(verificationAuth + 'auth.authRequestHandler.invokeRequestHandler = async () => ({users: [user]}); return () => auth.verifyIdToken(token, true).then(value => value.uid);'), validate: v => assert.equal(v, 'ada')},
  {name: 'auth / decode ID token', async: true, make: compiled('return () => jwt.decodeJwt(token).then(decoded => decoded.payload.sub);'), validate: v => assert.equal(v, 'ada')},
  {name: 'auth / project a user response', make: compiled('return () => new UserRecord(user);'), validate: v => {assert.equal(v.uid, 'ada'); assert.equal(v.providerData[0].providerId, 'google.com'); assert.equal(v.customClaims.classes.length, 2);}},
  {name: 'auth / serialize a user record', make: compiled('const record = new UserRecord(user); return () => record.toJSON();'), validate: v => {assert.equal(v.uid, 'ada'); assert.equal(v.metadata.lastSignInTime, 'Tue, 14 Nov 2023 22:13:20 GMT'); assert.deepEqual(v.customClaims.classes, ['math', 'science']);}},
  {name: 'auth / update disabled with synthetic transport', async: true, make: compiled(syntheticAuth + 'auth.authRequestHandler.invokeRequestHandler = async (_url, _settings, request) => request.disableUser === undefined ? {users: [user]} : {localId: request.localId}; const changes = {disabled: true}; return () => auth.updateUser("ada", changes);'), validate: v => {assert.equal(v.uid, 'ada'); assert.equal(v.email, user.email);}},
  {name: 'auth / delete 100 users with synthetic transport', async: true, make: compiled(syntheticAuth + 'const ids = Array.from({length: 100}, (_, i) => "user-" + i); const errors = [3, 27, 98].map(index => ({index, localId: ids[index], message: "FAIL"})); auth.authRequestHandler.invokeRequestHandler = async () => ({errors}); return () => auth.deleteUsers(ids);'), validate: v => {assert.equal(v.successCount, 97); assert.equal(v.failureCount, 3); assert.deepEqual(v.errors.map(e => e.index), [3, 27, 98]);}},
  {name: 'auth / get user through request dispatch', async: true, make: compiled(syntheticAuth + 'auth.authRequestHandler.httpClient.send = async () => ({data: {users: [user]}}); return () => auth.getUser("ada");'), validate: v => {assert.equal(v.uid, 'ada'); assert.equal(v.email, user.email);}},
  {name: 'auth / update disabled through request dispatch', async: true, make: compiled(syntheticAuth + 'auth.authRequestHandler.httpClient.send = async request => ({data: request.data.disableUser === undefined ? {users: [user]} : {localId: request.data.localId}}); const changes = {disabled: true}; return () => auth.updateUser("ada", changes);'), validate: v => {assert.equal(v.uid, 'ada'); assert.equal(v.email, user.email);}},
  {name: 'http / JSON request with synthetic response stream', async: true, make: compiled('env.syntheticHttp(); const client = new HttpClient(null); const config = {url: "http://example.test/accounts:lookup", method: "POST", data: {localId: ["ada"]}}; return () => client.send(config).then(response => response.data);'), validate: v => assert.deepEqual(v, {path: '/accounts:lookup', method: 'POST', body: '{"localId":["ada"]}'})},
  {name: 'http / JSON request with headers and synthetic stream', async: true, make: compiled('env.syntheticHttp(); const client = new HttpClient(null); const config = {url: "http://example.test/accounts:lookup", method: "POST", headers: {"X-Client-Version": "Node/Admin/14.5.0", Authorization: "Bearer fixture"}, data: {localId: ["ada"]}}; return () => client.send(config).then(response => response.data);'), validate: v => assert.deepEqual(v, {path: '/accounts:lookup', method: 'POST', body: '{"localId":["ada"]}'})},
  {name: 'messaging / retained copy and validation helper', make: compiled('return () => { const copy = deepCopy(message); messaging.validateMessage(copy); return copy.token; };'), validate: v => assert.equal(v, 'device-token')},
  {name: 'app / create context and read project', make: compiled('return () => new FirebaseApp({projectId: "bench", storageBucket: "bench.appspot.com"}, "bench").options.projectId;'), validate: v => assert.equal(v, 'bench')},
  {name: 'app / repeat initialization with equal options', make: compiled('const store = new AppStore(), options = {projectId: "bench", databaseAuthVariableOverride: {role: "admin"}}; const app = store.initializeApp(options); return () => store.initializeApp(options) === app;'), validate: v => assert.equal(v, true)},
  {name: 'app / cached service lookup', make: compiled('const app = new FirebaseApp({projectId: "bench"}, "bench"), names = ["auth", "firestore", "storage"]; for (const name of names) app.getOrInitService(name, () => ({name})); let index = 0; const unexpected = () => {throw Error("cache miss");}; return () => app.getOrInitService(names[index++ % names.length], unexpected).name;'), validate: v => assert.ok(['auth', 'firestore', 'storage'].includes(v))},
  {name: 'auth / cached OAuth access token', async: true, make: compiled('const lease = new FirebaseAppInternals({getAccessToken: () => Promise.resolve({access_token: "bench", expires_in: 3600})}); return lease.getToken().then(() => () => lease.getToken().then(token => token.accessToken));'), validate: v => assert.equal(v, 'bench')},
  {name: 'auth / twenty concurrent forced refreshes', async: true, make: compiled('const lease = new FirebaseAppInternals({getAccessToken: () => Promise.resolve({access_token: "bench", expires_in: 3600})}); return () => Promise.all(Array.from({length: 20}, () => lease.getToken(true))).then(tokens => tokens.every(token => token.accessToken === "bench"));'), validate: v => assert.equal(v, true)},
  {name: 'app / dispose three services', async: true, make: compiled('return () => {const app = new FirebaseApp({projectId: "bench"}, "bench"); for (const name of ["auth", "firestore", "storage"]) app.getOrInitService(name, () => ({delete: () => Promise.resolve()})); return app.delete().then(() => true);};'), validate: v => assert.equal(v, true)},
  {name: 'credential / build application-default context', make: compiled('return () => new ApplicationDefaultCredential();'), validate: v => assert.equal(typeof v.getAccessToken, 'function')},
  {name: 'credential / reuse service-account factory', make: compiled('return () => credentialFactory.cert(certificate).clientEmail;'), validate: v => assert.equal(v, certificate.client_email)},
  {name: 'credential / acquire cached Google client token', async: true, make: compiled(syntheticCredential + 'return () => credential.getAccessToken().then(token => token.access_token);'), validate: v => assert.equal(v, 'bench')},
  {name: 'credential / twenty concurrent acquisitions', async: true, make: compiled(syntheticCredential + 'return () => Promise.all(Array.from({length: 20}, () => credential.getAccessToken())).then(tokens => tokens.every(token => token.access_token === "bench"));'), validate: v => assert.equal(v, true)},
  {name: 'messaging / single send with synthetic dispatch', async: true, make: compiled(syntheticMessaging + 'return () => sender.send(message);'), validate: value => assert.equal(value, 'messages/device-token')},
  {name: 'messaging / three-recipient HTTP2 multicast plan', async: true, make: compiled(syntheticMessaging + 'const input = {tokens: ["one", "stale", "three"], notification: {title: "Reminder", body: "Practice"}, data: {receiptId: "receipt-1"}, apns: {payload: {aps: {sound: "default"}}}}; return () => sender.sendEachForMulticast(input);'), validate: value => {assert.equal(value.successCount, 2); assert.equal(value.failureCount, 1); assert.equal(value.responses[1].error.code, 'messaging/registration-token-not-registered'); assert.equal(value.responses[2].messageId, 'messages/three');}},
  {name: 'messaging / hundred-recipient HTTP2 multicast plan', async: true, make: compiled(syntheticMessaging + 'const input = {tokens: Array.from({length: 100}, (_, i) => "device-" + i), notification: {title: "Reminder", body: "Practice"}, data: {receiptId: "receipt-1"}, apns: {payload: {aps: {sound: "default"}}}}; return () => sender.sendEachForMulticast(input);'), validate: value => {assert.equal(value.successCount, 100); assert.equal(value.responses[99].messageId, 'messages/device-99');}},
  {name: 'messaging / HTTP1 batch with local validation failure', async: true, make: compiled(syntheticMessaging + 'sender.enableLegacyHttpTransport(); const input = [{token: "one"}, {}, {token: "three"}]; return () => sender.sendEach(input);'), validate: value => {assert.equal(value.successCount, 2); assert.equal(value.failureCount, 1); assert.equal(value.responses[1].error.code, 'messaging/invalid-payload');}},
  {name: 'storage / construct service-account context', make: compiled('const app = new FirebaseApp({projectId: "bench", credential: credentialFactory.cert(certificate)}, "bench"); return () => new AdminStorage(app);'), validate: value => assert.equal(value.app.name, 'bench')},
  {name: 'storage / construct application-default context', make: compiled('const app = new FirebaseApp({projectId: "bench", credential: new ApplicationDefaultCredential()}, "bench"); return () => new AdminStorage(app);'), validate: value => assert.equal(value.app.name, 'bench')},
  {name: 'storage / default bucket handle', make: compiled('const app = new FirebaseApp({projectId: "bench", storageBucket: "fixture", credential: new ApplicationDefaultCredential()}, "bench"), service = new AdminStorage(app); return () => service.bucket().name;'), validate: value => assert.equal(value, 'fixture')},
  {name: 'storage / explicit bucket handle', make: compiled('const app = new FirebaseApp({projectId: "bench", credential: new ApplicationDefaultCredential()}, "bench"), service = new AdminStorage(app); return () => service.bucket("fixture").name;'), validate: value => assert.equal(value, 'fixture')},
];
const prefix = process.argv.find(arg => arg.startsWith('--prefix='))?.slice(9);
require('../../../scripts/bench-process.cjs').run({validationOnly: process.argv.includes('--validate'), root: path.resolve(__dirname, '..'), upstream: roots.upstream, vpm: roots.vpm, cases: prefix ? cases.filter(item => item.name.startsWith(prefix)) : cases,
  files: ['package.json', 'lib', 'bench/compare.cjs', 'bench/token-fixture.json', 'bench/no-kid-fixture.json', '../vjsonwebtoken/index.js', '../vjsonwebtoken/lib', '../vjws/index.js', '../vjws/lib', '../vjwa/index.js',
    '../vgoogle-auth-library/lib', '../vgoogle-cloud-storage/lib', '../vgoogle-cloud-firestore/build/src',
    '../../scripts/firebase-admin-conformance/node_modules/@google-cloud/storage/build/cjs/src',
    '../../scripts/firebase-admin-conformance/node_modules/@google-cloud/firestore/build/src', '../../scripts/firebase-admin-conformance/upstream/test/resources/mock.key.json',
    '../../scripts/firebase-admin-conformance/package-lock.json', '../../scripts/firebase-admin-conformance/node_modules/firebase-admin/lib',
    '../../scripts/firebase-admin-conformance/node_modules/google-auth-library/build/src',
    '../../scripts/firebase-admin-conformance/node_modules/jsonwebtoken/index.js', '../../scripts/firebase-admin-conformance/node_modules/jsonwebtoken/lib',
    '../../scripts/firebase-admin-conformance/node_modules/jws/index.js', '../../scripts/firebase-admin-conformance/node_modules/jws/lib',
    '../../scripts/firebase-admin-conformance/node_modules/jwa/index.js']}).catch(e => {console.error(e); process.exitCode = 1;});
