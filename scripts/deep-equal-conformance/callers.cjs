'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {createRequire, isBuiltin} = require('node:module');
const from = createRequire(path.resolve(__dirname, '../protobuf-conformance/package.json'));

function consumer(equal) {
  const cache = new Map(), stats = {imports: 0};
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const local = createRequire(file), module = {exports: {}};
    cache.set(file, module);
    function req(name) {
      if (name === 'fast-deep-equal') {stats.imports++; return equal;}
      if (isBuiltin(name)) return local(name);
      const resolved = local.resolve(name);
      return /\/node_modules\/@google-cloud\/firestore\//.test(resolved) ? load(resolved) : local(name);
    }
    req.resolve = local.resolve;
    new Function('exports', 'require', 'module', '__filename', '__dirname', fs.readFileSync(file, 'utf8'))(module.exports, req, module, file, path.dirname(file));
    return module.exports;
  }
  return {sdk: load(from.resolve('@google-cloud/firestore')), stats};
}

function cases(equal) {
  const {sdk, stats} = consumer(equal), {Firestore, FieldValue, AggregateField} = sdk;
  const db = new Firestore({projectId: 'equality-fixture'});
  const snapshot = fields => db.snapshot_({name: 'projects/equality-fixture/databases/(default)/documents/items/one', fields, createTime: {seconds: 1}, updateTime: {seconds: 2}}, {seconds: 3});
  const fields = () => ({title: {stringValue: 'one'}, count: {integerValue: '42'}, nested: {mapValue: {fields: {active: {booleanValue: true}}}}, tags: {arrayValue: {values: [{stringValue: 'a'}, {stringValue: 'b'}]}}});
  const a = snapshot(fields()), b = snapshot(fields()), c = snapshot({...fields(), count: {integerValue: '43'}});
  const query = n => db.collection('items').where('nested', '==', {n, labels: ['a', 'b']}).orderBy('count').startAt(1).endBefore(100).select('title', 'count');
  const q1 = query(1), q2 = query(1), q3 = query(2);
  const u1 = FieldValue.arrayUnion({a: 1}, 'b'), u2 = FieldValue.arrayUnion({a: 1}, 'b');
  const r1 = FieldValue.arrayRemove({a: 1}), r2 = FieldValue.arrayRemove({a: 2});
  const ag1 = q1.aggregate({n: AggregateField.count(), total: AggregateField.sum('count')});
  const ag2 = q2.aggregate({n: AggregateField.count(), total: AggregateField.sum('count')});
  assert.ok(stats.imports >= 6, 'actual SDK modules must receive the selected comparator');
  return [
    {name: 'Firestore / equal document', run: () => a.isEqual(b), expected: true},
    {name: 'Firestore / changed document', run: () => a.isEqual(c), expected: false},
    {name: 'Firestore / equal query', run: () => q1.isEqual(q2), expected: true},
    {name: 'Firestore / changed filter', run: () => q1.isEqual(q3), expected: false},
    {name: 'Firestore / arrayUnion', run: () => u1.isEqual(u2), expected: true},
    {name: 'Firestore / arrayRemove', run: () => r1.isEqual(r2), expected: false},
    {name: 'Firestore / aggregate query', run: () => ag1.isEqual(ag2), expected: true},
    {name: 'Firestore / distinct binary document', run: () => snapshot({data: {bytesValue: Buffer.from([0xff])}}).isEqual(snapshot({data: {bytesValue: Buffer.from([0xfe])}})), expected: false, regression: true},
    {name: 'Firestore / distinct binary transform', run: () => FieldValue.arrayUnion(Buffer.from([0xff])).isEqual(FieldValue.arrayUnion(Buffer.from([0xfe]))), expected: false, regression: true},
  ];
}
function run(upstream = false) {
  const equal = require(upstream ? './node_modules/fast-deep-equal' : '../../packages/vfast-deep-equal');
  const all = cases(equal);
  for (const item of all) assert.equal(item.run(), upstream && item.regression ? true : item.expected, item.name);
  console.log(`${upstream ? 'Upstream control reproduces two binary false positives' : 'VPM fixes two binary false positives'}; seven ordinary Firestore 9.4.0 equality paths pass.`);
}
module.exports = run;
module.exports.cases = cases;
if (require.main === module) run(process.argv.includes('--upstream'));
