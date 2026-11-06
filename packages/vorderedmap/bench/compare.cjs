'use strict';
const path = require('node:path'), assert = require('node:assert/strict');
const fixture = path.resolve(__dirname, '../../../scripts/orderedmap-conformance');
const root = path.resolve(__dirname, '..'), upstream = path.join(fixture, 'node_modules/orderedmap');
const record = (n, offset = 0) => Object.fromEntries(Array.from({length: n}, (_, i) => ['k' + (offset + i), i]));
const cases = [
  {name: 'construct 16 entries', make(file) { const M = require(file), input = record(16); return () => M.from(input); }, validate: value => assert.equal(value.size, 16)},
  {name: 'update 16-entry map', make(file) { const M = require(file), map = M.from(record(16)); return () => map.update('k8', 99); }, validate: value => assert.equal(value.get('k8'), 99)},
  {name: 'lookup 128-entry map', make(file) { const map = require(file).from(record(128)); let i = 0; return () => map.get('k' + ((i++ * 37) & 127)); }, validate: value => assert(value >= 0 && value < 128)},
  {name: 'append overlapping 128-entry maps', make(file) { const M = require(file), a = M.from(record(128)), b = M.from(record(128, 64)); return () => a.append(b); }, validate: value => { assert.equal(value.size, 192); assert.equal(value.get('k64'), 0); }},
  {name: 'subtract overlapping 128-entry maps', make(file) { const M = require(file), a = M.from(record(128)), b = M.from(record(128, 64)); return () => a.subtract(b); }, validate: value => { assert.equal(value.size, 64); assert.equal(value.get('k64'), undefined); }},
  {name: 'ProseMirror 1.25.12 schema construction', make(file) {
    const M = require(file), {Schema} = require(path.join(fixture, 'model.cjs'))('prosemirror-model', M);
    const nodes = {doc: {content: 'block+'}, paragraph: {content: 'inline*', group: 'block'}, text: {group: 'inline'}};
    for (let i = 0; i < 12; i++) nodes['block' + i] = {content: 'inline*', group: 'block'};
    const spec = {nodes, marks: {strong: {}, em: {}, link: {attrs: {href: {}}}}};
    return () => new Schema(spec);
  }, validate: value => { assert.equal(Object.keys(value.nodes).length, 15); assert.equal(value.topNodeType.contentMatch.defaultType.name, 'paragraph'); }},
];
require('../../../scripts/bench-process.cjs').run({root, upstream, vpm: root, cases, files: ['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/orderedmap-conformance/model.cjs','../../scripts/orderedmap-conformance/package-lock.json','../../scripts/orderedmap-conformance/node_modules/orderedmap','../../scripts/orderedmap-conformance/node_modules/prosemirror-model']}).catch(error => { console.error(error); process.exitCode = 1; });
