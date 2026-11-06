'use strict';
const assert = require('node:assert/strict');
const upstream = require('orderedmap');
const replacement = process.env.VPM_ORDEREDMAP_ENTRY ? require(process.env.VPM_ORDEREDMAP_ENTRY) : require('../../packages/vorderedmap');
function run(Map, version) {
  let calls = 0;
  const tracked = new Proxy(Map, {get(target, key) { return key === 'from' ? value => { calls++; return target.from(value); } : Reflect.get(target, key); }});
  const {Schema} = require('./model.cjs')(version, tracked);
  const base = Map.from({doc: {content: 'block+'}, paragraph: {content: 'inline*', group: 'block'}, text: {group: 'inline'}});
  const nodes = base.addBefore('paragraph', 'heading', {content: 'inline*', group: 'block', attrs: {level: {default: 1}}}).append({image: {inline: true, group: 'inline', attrs: {src: {}}, atom: true}});
  const marks = Map.from({em: {}}).addToStart('strong', {}).append({link: {attrs: {href: {}}}});
  const schema = new Schema({nodes, marks});
  assert(schema.spec.nodes instanceof Map); assert(schema.spec.marks instanceof Map);
  assert.equal(schema.topNodeType.contentMatch.defaultType.name, 'heading');
  const doc = schema.node('doc', null, [schema.node('heading', {level: 2}, schema.text('Title')), schema.node('paragraph', null, [schema.text('Hello', [schema.mark('em'), schema.mark('strong')]), schema.node('image', {src: 'example.png'})])]);
  doc.check(); const json = doc.toJSON(); assert.deepEqual(schema.nodeFromJSON(json).toJSON(), json);
  assert.deepEqual(json.content[1].content[0].marks.map(mark => mark.type), ['strong', 'em']);
  const second = new Schema({nodes: nodes.remove('heading'), marks: marks.update('em', {excludes: 'strong'})});
  assert.equal(second.topNodeType.contentMatch.defaultType.name, 'paragraph');
  assert.equal(schema.nodes.heading.name, 'heading');
  assert.equal(base.get('heading'), undefined);
  assert.equal(calls, 4);
  return {json, nodes: Object.keys(schema.nodes), marks: Object.keys(schema.marks), defaultType: schema.topNodeType.contentMatch.defaultType.name};
}
for (const version of ['prosemirror-model-app', 'prosemirror-model']) assert.deepEqual(run(replacement, version), run(upstream, version));
console.log('Unchanged ProseMirror 1.25.4 and 1.25.12: schema ordering/default types, extension edits, marks, documents and JSON round-trips match upstream (8 instrumented VPM factory calls).');
