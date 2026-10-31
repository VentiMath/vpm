'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const upstream = require('../../../scripts/rbtree-conformance/node_modules/functional-red-black-tree');
const vpm = require('..');
let seed = 7;
const random = n => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) % n;
const shuffled = Array.from({length: 1000}, (_, i) => i).sort(() => random(3) - 1);
const probes = Array.from({length: 64}, () => random(10000));
// Firestore's Watch keeps snapshots ordered by document path; each change
// removes the old entry, inserts the new one and reads its index.
const documentPath = i => 'projects/p/databases/(default)/documents/items/' + String(i).padStart(5, '0');
const docs = Array.from({length: 1000}, (_, i) => documentPath(i * 2));
const changes = Array.from({length: 100}, () => [docs[random(1000)], documentPath(random(2000) * 2 + 1)]);
const env = {shuffled, probes, docs, changes};
// Each variant gets freshly compiled case code, comparators included. Shared
// closures would make call sites polymorphic and penalize whichever tree runs
// second: identical copies measured 10-24% apart that way.
const prelude = 'const {shuffled, probes, docs, changes} = env; const numeric = (a, b) => a - b; const byPath = (a, b) => a < b ? -1 : a > b ? 1 : 0;\n' +
  'const build = (keys, compare = numeric) => { let tree = lib(compare); for (const key of keys) tree = tree.insert(key, key); return tree; };\n' +
  'const range = n => Array.from({length: n}, (_, i) => i);\n';
const compiled = body => lib => new Function('lib', 'env', prelude + body)(lib, env);
const cases = [
  {name: 'build / 1,000 sequential inserts', make: compiled('const keys = range(1000); return () => build(keys).length;'), validate: v => assert.equal(v, 1000)},
  {name: 'build / 1,000 shuffled inserts', make: compiled('return () => build(shuffled).length;'), validate: v => assert.equal(v, 1000)},
  {name: 'lookup / 64 get in 10,000', make: compiled('const tree = build(range(10000)); return () => { let sum = 0; for (const key of probes) sum += tree.get(key); return sum; };'), validate: v => assert.equal(v, probes.reduce((a, b) => a + b, 0))},
  {name: 'lookup / 64 find().index in 10,000', make: compiled('const tree = build(range(10000)); return () => { let sum = 0; for (const key of probes) sum += tree.find(key).index; return sum; };'), validate: v => assert.equal(v, probes.reduce((a, b) => a + b, 0))},
  {name: 'position / 64 at() in 10,000', make: compiled('const tree = build(range(10000)); return () => { let sum = 0; for (const i of probes) sum += tree.at(i).key; return sum; };'), validate: v => assert.equal(v, probes.reduce((a, b) => a + b, 0))},
  {name: 'traverse / keys of 1,000', make: compiled('const tree = build(shuffled); return () => tree.keys.length;'), validate: v => assert.equal(v, 1000)},
  {name: 'traverse / forEach range 250-750', make: compiled('const tree = build(shuffled); return () => { let n = 0; tree.forEach(() => { n++; }, 250, 750); return n; };'), validate: v => assert.equal(v, 500)},
  {name: 'remove / 64 persistent removals from 1,000', make: compiled('const tree = build(shuffled); return () => { let sum = 0; for (const key of probes) sum += tree.remove(key % 1000).length; return sum; };'), validate: v => assert.equal(v, 64 * 999)},
  {name: 'Firestore Watch / 100 document changes in 1,000', make: compiled('const tree = build(docs, byPath); return () => { let t = tree, sum = 0; for (const [from, to] of changes) { const found = t.find(from); if (found.valid) t = found.remove(); t = t.insert(to, null); sum += t.find(to).index; } return sum + t.length; };'), validate: v => assert.ok(v > 0)},
];
require('../../../scripts/bench-paired.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases, files: ['package.json', 'index.js', 'bench/compare.cjs', '../../scripts/rbtree-conformance/package-lock.json']}).catch(e => {console.error(e); process.exitCode = 1;});
