'use strict';
// Per-request CPU work in Firebase Admin: ID-token signature verification and
// decoding (jsonwebtoken upstream, vjsonwebtoken here) and FCM message
// validation, each library on its own dependencies.
const assert = require('node:assert/strict'), path = require('node:path');
const roots = {upstream: path.resolve(__dirname, '../../../scripts/firebase-admin-conformance/node_modules/firebase-admin'), vpm: path.resolve(__dirname, '..')};
const library = root => ({jwt: require(path.join(root, 'lib/utils/jwt.js')), messaging: require(path.join(root, 'lib/messaging/messaging-internal.js')),
  deepCopy: require(path.join(root, 'lib/utils/deep-copy.js')).deepCopy});
const {token, publicKey} = require('./token-fixture.json');
const message = {token: 'device-token', notification: {title: 'Practice set ready', body: 'Ten problems on modular arithmetic'}, data: {set: '42', topic: 'number-theory'},
  android: {priority: 'high', notification: {channelId: 'practice', clickAction: 'OPEN_SET'}}, apns: {payload: {aps: {badge: 1, sound: 'default'}}, headers: {'apns-priority': '10'}},
  webpush: {fcmOptions: {link: 'https://example.com/sets/42'}}};
const env = {token, publicKey, message, library};
// A worker constructs only its selected SDK; both workers use the same fixed token.
const compiled = body => async lib => new Function('lib', 'env', 'const {token, publicKey, message} = env; const {jwt, messaging, deepCopy} = env.library(lib);\n' + body)(lib, env);
const cases = [
  {name: 'auth / verify RS256 ID token signature', async: true, make: compiled('return () => jwt.verifyJwtSignature(token, publicKey, {algorithms: ["RS256"]}).then(() => true);'), validate: v => assert.equal(v, true)},
  {name: 'auth / decode ID token', async: true, make: compiled('return () => jwt.decodeJwt(token).then(decoded => decoded.payload.sub);'), validate: v => assert.equal(v, 'ada')},
  {name: 'messaging / copy and validate a message', make: compiled('return () => { const copy = deepCopy(message); messaging.validateMessage(copy); return copy.token; };'), validate: v => assert.equal(v, 'device-token')},
];
require('../../../scripts/bench-process.cjs').run({root: path.resolve(__dirname, '..'), upstream: roots.upstream, vpm: roots.vpm, cases,
  files: ['package.json', 'lib', 'bench/compare.cjs', 'bench/token-fixture.json', '../vjsonwebtoken/index.js', '../vjsonwebtoken/lib', '../vjws/index.js', '../vjws/lib', '../vjwa/index.js',
    '../../scripts/firebase-admin-conformance/package-lock.json', '../../scripts/firebase-admin-conformance/node_modules/firebase-admin/lib',
    '../../scripts/firebase-admin-conformance/node_modules/jsonwebtoken/index.js', '../../scripts/firebase-admin-conformance/node_modules/jsonwebtoken/lib',
    '../../scripts/firebase-admin-conformance/node_modules/jws/index.js', '../../scripts/firebase-admin-conformance/node_modules/jws/lib',
    '../../scripts/firebase-admin-conformance/node_modules/jwa/index.js']}).catch(e => {console.error(e); process.exitCode = 1;});
