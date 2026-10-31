'use strict';
// CPU work Firestore does for every document and query, with each library on
// its own dependencies: encoding writes, decoding read results into
// snapshots, building query protos and comparing snapshots.
const assert = require('node:assert/strict'), path = require('node:path');
const upstream = require(path.resolve(__dirname, '../../../scripts/firestore-conformance/node_modules/@google-cloud/firestore'));
const vpm = require('..');
const data = {name: 'Ada Lovelace', score: 42, ratio: 0.75, active: true, missing: null, joined: {seconds: 1700000000, nanoseconds: 5},
  tags: ['math', 'engines', 'poetry'], profile: {city: 'London', languages: ['en', 'fr'], nested: {depth: 2, values: [1, 2, 3]}},
  bytes: [1, 2, 3, 4, 5, 6, 7, 8], location: [51.5, -0.12], history: Array.from({length: 10}, (_, i) => ({at: i, note: 'entry ' + i}))};
const env = {data};
// Each variant gets freshly compiled case code (see docs/DEVELOPMENT.md).
const prelude = `const {data} = env; const db = new lib.Firestore({projectId: 'p'});
const doc = {...data, joined: new lib.Timestamp(data.joined.seconds, data.joined.nanoseconds), bytes: Buffer.from(data.bytes),
  location: new lib.GeoPoint(data.location[0], data.location[1]), friend: db.doc('users/grace')};
const fields = db._serializer.encodeFields(doc);
const proto = {name: 'projects/p/databases/(default)/documents/users/ada', fields, createTime: {seconds: 1, nanos: 0}, updateTime: {seconds: 2, nanos: 0}};
const readTime = {seconds: 3, nanos: 0};
`;
const compiled = body => async lib => new Function('lib', 'env', prelude + body)(lib, env);
const cases = [
  {name: 'encode / 12-field document', make: compiled('return () => Object.keys(db._serializer.encodeFields(doc)).length;'), validate: v => assert.equal(v, 12)},
  {name: 'decode / snapshot data() of 12-field document', make: compiled('return () => Object.keys(db.snapshot_(proto, readTime, "protobufJS").data()).length;'), validate: v => assert.equal(v, 12)},
  {name: 'write / batch set merge with transforms', make: compiled('return () => { const batch = db.batch(); batch.set(db.doc("users/ada"), {...doc, seen: lib.FieldValue.serverTimestamp(), visits: lib.FieldValue.increment(1)}, {merge: true}); return batch._ops.length; };'), validate: v => assert.equal(v, 1)},
  {name: 'query / where, orderBy, limit to proto', make: compiled('return () => db.collection("users").where("score", ">", 10).where("active", "==", true).orderBy("score", "desc").limit(20).toProto().structuredQuery.orderBy.length;'), validate: v => assert.ok(v >= 1)},
  {name: 'compare / isEqual of equal snapshots', make: compiled('const a = db.snapshot_(proto, readTime, "protobufJS"), b = db.snapshot_(proto, readTime, "protobufJS"); return () => a.isEqual(b);'), validate: v => assert.equal(v, true)},
  {name: 'timestamp / fromMillis, toDate, valueOf', make: compiled('return () => { const t = lib.Timestamp.fromMillis(1700000000123); return t.toDate().getTime() + t.valueOf().length; };'), validate: v => assert.equal(v, 1700000000123 + 22)},
];
require('../../../scripts/bench-paired.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases,
  files: ['package.json', 'build/src/index.js', 'build/src/serializer.js', 'bench/compare.cjs', '../../scripts/firestore-conformance/package-lock.json']}).catch(e => {console.error(e); process.exitCode = 1;});
