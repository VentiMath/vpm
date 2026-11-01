'use strict';
// CPU work in Firebase Admin's app, credential, token, user-management and messaging paths.
// Each worker loads only its selected SDK and dependencies.
const assert = require('node:assert/strict'), path = require('node:path');
const roots = {upstream: path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/node_modules/firebase-admin'), vpm: path.resolve(__dirname, '..')};
const library = root => ({jwt: require(path.join(root, 'lib/utils/jwt.js')), messaging: require(path.join(root, 'lib/messaging/messaging-internal.js')),
  deepCopy: require(path.join(root, 'lib/utils/deep-copy.js')).deepCopy,
  UserRecord: require(path.join(root, 'lib/auth/user-record.js')).UserRecord,
  Auth: require(path.join(root, 'lib/auth/auth.js')).Auth,
  credentialFactory: require(path.join(root, 'lib/app/credential-factory.js')),
  ApplicationDefaultCredential: require(path.join(root, 'lib/app/credential-internal.js')).ApplicationDefaultCredential,
  ...require(path.join(root, 'lib/app/firebase-app.js')), ...require(path.join(root, 'lib/app/lifecycle.js'))});
const {token, publicKey} = require('./token-fixture.json');
// Public test-only key already retained with the upstream conformance fixture.
const certificate = require('../../../scripts/firebase-admin-conformance/upstream/test/resources/mock.key.json');
const message = {token: 'device-token', notification: {title: 'Practice set ready', body: 'Ten problems on modular arithmetic'}, data: {set: '42', topic: 'number-theory'},
  android: {priority: 'high', notification: {channelId: 'practice', clickAction: 'OPEN_SET'}}, apns: {payload: {aps: {badge: 1, sound: 'default'}}, headers: {'apns-priority': '10'}},
  webpush: {fcmOptions: {link: 'https://example.com/sets/42'}}};
const user = {localId: 'ada', email: 'ada@example.com', emailVerified: true, displayName: 'Ada',
  phoneNumber: '+15555550100', createdAt: '1600000000000', lastLoginAt: '1700000000000', validSince: '1600000000',
  providerUserInfo: [{rawId: 'ada-google', providerId: 'google.com', email: 'ada@example.com'}],
  customAttributes: '{"role":"teacher","classes":["math","science"]}'};
const env = {token, publicKey, message, library, certificate, user};
// A worker constructs only its selected SDK; both workers use the same fixed token.
const compiled = body => async lib => new Function('lib', 'env', 'const {token, publicKey, message, certificate, user} = env; const {jwt, messaging, deepCopy, UserRecord, Auth, FirebaseApp, FirebaseAppInternals, AppStore, credentialFactory, ApplicationDefaultCredential} = env.library(lib);\n' + body)(lib, env);
const syntheticCredential = 'const credential = new ApplicationDefaultCredential(); const client = {credentials: {access_token: "bench", expiry_date: Date.now() + 3600000}, getAccessToken: async () => ({token: "bench"})}; credential.googleAuth.getClient = async () => client; ';
// The transport returns fixed JSON outside network I/O; these cases measure the
// complete public operation's request planning and result projection, not HTTP.
const syntheticAuth = 'const app = new FirebaseApp({projectId: "bench", credential: {getAccessToken: async () => ({access_token: "bench", expires_in: 3600})}}, "bench"); const auth = new Auth(app); ';
const verificationAuth = syntheticAuth.replace('projectId: "bench"', 'projectId: "p"') +
  'auth.idTokenVerifier.signatureVerifier.keyFetcher.fetchPublicKeys = async () => ({k1: publicKey}); ';
const cases = [
  {name: 'auth / verify RS256 ID token signature', async: true, make: compiled('return () => jwt.verifyJwtSignature(token, publicKey, {algorithms: ["RS256"]}).then(() => true);'), validate: v => assert.equal(v, true)},
  {name: 'auth / verify ID token with cached test key', async: true, make: compiled(verificationAuth + 'return () => auth.verifyIdToken(token).then(value => value.uid);'), validate: v => assert.equal(v, 'ada')},
  {name: 'auth / verify ID token and synthetic revocation lookup', async: true, make: compiled(verificationAuth + 'auth.authRequestHandler.invokeRequestHandler = async () => ({users: [user]}); return () => auth.verifyIdToken(token, true).then(value => value.uid);'), validate: v => assert.equal(v, 'ada')},
  {name: 'auth / decode ID token', async: true, make: compiled('return () => jwt.decodeJwt(token).then(decoded => decoded.payload.sub);'), validate: v => assert.equal(v, 'ada')},
  {name: 'auth / project a user response', make: compiled('return () => new UserRecord(user);'), validate: v => {assert.equal(v.uid, 'ada'); assert.equal(v.providerData[0].providerId, 'google.com'); assert.equal(v.customClaims.classes.length, 2);}},
  {name: 'auth / serialize a user record', make: compiled('const record = new UserRecord(user); return () => record.toJSON();'), validate: v => {assert.equal(v.uid, 'ada'); assert.equal(v.metadata.lastSignInTime, 'Tue, 14 Nov 2023 22:13:20 GMT'); assert.deepEqual(v.customClaims.classes, ['math', 'science']);}},
  {name: 'auth / update disabled with synthetic transport', async: true, make: compiled(syntheticAuth + 'auth.authRequestHandler.invokeRequestHandler = async (_url, _settings, request) => request.disableUser === undefined ? {users: [user]} : {localId: request.localId}; const changes = {disabled: true}; return () => auth.updateUser("ada", changes);'), validate: v => {assert.equal(v.uid, 'ada'); assert.equal(v.email, user.email);}},
  {name: 'auth / delete 100 users with synthetic transport', async: true, make: compiled(syntheticAuth + 'const ids = Array.from({length: 100}, (_, i) => "user-" + i); const errors = [3, 27, 98].map(index => ({index, localId: ids[index], message: "FAIL"})); auth.authRequestHandler.invokeRequestHandler = async () => ({errors}); return () => auth.deleteUsers(ids);'), validate: v => {assert.equal(v.successCount, 97); assert.equal(v.failureCount, 3); assert.deepEqual(v.errors.map(e => e.index), [3, 27, 98]);}},
  {name: 'messaging / copy and validate a message', make: compiled('return () => { const copy = deepCopy(message); messaging.validateMessage(copy); return copy.token; };'), validate: v => assert.equal(v, 'device-token')},
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
];
require('../../../scripts/bench-process.cjs').run({root: path.resolve(__dirname, '..'), upstream: roots.upstream, vpm: roots.vpm, cases,
  files: ['package.json', 'lib', 'bench/compare.cjs', 'bench/token-fixture.json', '../vjsonwebtoken/index.js', '../vjsonwebtoken/lib', '../vjws/index.js', '../vjws/lib', '../vjwa/index.js',
    '../vgoogle-auth-library/lib', '../../scripts/firebase-admin-conformance/upstream/test/resources/mock.key.json',
    '../../scripts/firebase-admin-conformance/package-lock.json', '../../scripts/firebase-admin-conformance/node_modules/firebase-admin/lib',
    '../../scripts/firebase-admin-conformance/node_modules/google-auth-library/build/src',
    '../../scripts/firebase-admin-conformance/node_modules/jsonwebtoken/index.js', '../../scripts/firebase-admin-conformance/node_modules/jsonwebtoken/lib',
    '../../scripts/firebase-admin-conformance/node_modules/jws/index.js', '../../scripts/firebase-admin-conformance/node_modules/jws/lib',
    '../../scripts/firebase-admin-conformance/node_modules/jwa/index.js']}).catch(e => {console.error(e); process.exitCode = 1;});
