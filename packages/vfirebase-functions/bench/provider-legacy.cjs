'use strict';
// Historical provider cases retained for a later migration. They build an
// upstream protobuf fixture at module load and are not current evidence.
// Current isolated logging/init measurements use compare.cjs.
// Per-event CPU work in Cloud Functions: decoding a Firestore trigger's
// protobuf DocumentEventData into a snapshot and reading it, and parsing a
// callable request. Each library runs on its own dependencies (firebase-admin
// 14.5.0 and its Firestore upstream; vfirebase-admin and VPM's here).
const assert = require('node:assert/strict'), path = require('node:path');
process.env.GCLOUD_PROJECT ||= 'p';
const roots = {upstream: path.resolve(__dirname, '../../../scripts/firebase-functions-conformance/node_modules/firebase-functions'), vpm: path.resolve(__dirname, '..')};
const {google} = require(path.join(roots.upstream, 'protos/compiledFirestore.js'));
const event = Buffer.from(google.events.cloud.firestore.v1.DocumentEventData.encode({value: {name: 'projects/p/databases/(default)/documents/rooms/r1',
  createTime: {seconds: 1700000000}, updateTime: {seconds: 1700000001}, fields: {
    title: {stringValue: 'Number theory'}, seats: {integerValue: 12}, open: {booleanValue: true}, ratio: {doubleValue: 0.75},
    tags: {arrayValue: {values: [{stringValue: 'primes'}, {stringValue: 'modular'}]}},
    owner: {mapValue: {fields: {uid: {stringValue: 'ada'}, since: {timestampValue: {seconds: 1690000000}}}}},
    members: {arrayValue: {values: Array.from({length: 10}, (_, i) => ({mapValue: {fields: {uid: {stringValue: 'u' + i}, score: {integerValue: i}}}}))}}}}}).finish());
const library = root => ({firestore: require(path.join(root, 'lib/common/providers/firestore.js')), https: require(path.join(root, 'lib/common/providers/https.js'))});
const env = {event, library};
// Each variant gets freshly compiled case code (see docs/DEVELOPMENT.md).
const compiled = body => async lib => new Function('lib', 'env', 'const {event} = env; const {firestore, https} = env.library(lib);\n' + body)(lib, env);
const cases = [
  {name: 'firestore trigger / decode event into a snapshot', make: compiled('return () => firestore.createSnapshotFromProtobuf(event, "rooms/r1", "(default)").id;'), validate: v => assert.equal(v, 'r1')},
  {name: 'firestore trigger / decode and read data()', make: compiled('return () => Object.keys(firestore.createSnapshotFromProtobuf(event, "rooms/r1", "(default)").data()).length;'), validate: v => assert.equal(v, 7)},
  {name: 'callable / validate and decode a request body', make: compiled('const request = {method: "POST", header: name => ({"content-type": "application/json"})[name.toLowerCase()], body: {data: {answer: "42", attempts: [1, 2, 3], at: {"@type": "type.googleapis.com/google.protobuf.Int64Value", value: "7"}}}}; return () => https.isValidRequest(request) && https.decode(request.body.data).attempts.length;'), validate: v => assert.equal(v, 3)},
];
require('../../../scripts/bench-paired.cjs').run({root: path.resolve(__dirname, '..'), upstream: roots.upstream, vpm: roots.vpm, cases,
  files: ['package.json', 'lib/common/providers/firestore.js', 'lib/common/providers/https.js', 'bench/compare.cjs', '../vgoogle-cloud-firestore/package.json', '../../scripts/firebase-functions-conformance/package-lock.json']}).catch(e => {console.error(e); process.exitCode = 1;});
