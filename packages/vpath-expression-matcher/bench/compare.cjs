'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const upstream=await import('../../../scripts/path-matcher-conformance/node_modules/path-expression-matcher/src/index.js'),vpm=require('..');
 const at=(lib,tags)=>{const m=new lib.Matcher();for(const tag of tags)m.push(tag);return m;};
 const cases=[
  {name:'construct simple expression',make:lib=>()=>new lib.Expression('root.items.item').length,validate:v=>assert.equal(v,3)},
  {name:'construct predicate expression',make:lib=>()=>new lib.Expression('root..ns::item[id=42]:nth(2)').length,validate:v=>assert.equal(v,3)},
  {name:'create matcher and view',make:lib=>()=>new lib.Matcher().readOnly().getDepth(),validate:v=>assert.equal(v,0)},
  {name:'XML sibling push and pop',make:lib=>{const m=at(lib,['root']);return()=>{m.push('item',{id:1});const n=m.getPosition()-m.getCounter();m.pop();return n;};},validate:v=>assert.equal(v,0)},
  {name:'walk multipart XML paths',make:lib=>{const m=new lib.Matcher();return()=>{m.reset();m.push('CompleteMultipartUpload');let n=0;for(let i=0;i<4;i++){m.push('Part');for(const tag of ['PartNumber','ETag']){m.push(tag);n+=m.toString().length;m.pop();}m.pop();}m.pop();return n;};},validate:v=>assert.equal(v,288)},
  {name:'match exact path',make:lib=>{const m=at(lib,['root','items','item']),e=new lib.Expression('root.items.item');return()=>m.matches(e);},validate:v=>assert.equal(v,true)},
  {name:'match deep path',make:lib=>{const m=at(lib,['root','a','b','c','item']),e=new lib.Expression('root..item');return()=>m.matches(e);},validate:v=>assert.equal(v,true)},
  {name:'indexed expression set hit',make:lib=>{const m=at(lib,['root','item99']),s=new lib.ExpressionSet();for(let i=0;i<100;i++)s.add(new lib.Expression('root.item'+i));s.seal();return()=>s.matchesAny(m);},validate:v=>assert.equal(v,true)},
  {name:'cached view path string',make:lib=>{const m=at(lib,['root','items','item']).readOnly();m.toString();return()=>m.toString();},validate:v=>assert.equal(v,'root.items.item')},
  {name:'snapshot and restore',make:lib=>{const m=at(lib,['root','item']);m.updateCurrent({id:'42'});return()=>{const s=m.snapshot();m.restore(s);return m.getAttrValue('id');};},validate:v=>assert.equal(v,'42')},
 ];
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','lib/expression.js','lib/matcher.js','lib/set.js','bench/compare.cjs','../../scripts/path-matcher-conformance/upstream/SHA256.json']});
})().catch(e=>{console.error(e);process.exitCode=1;});
