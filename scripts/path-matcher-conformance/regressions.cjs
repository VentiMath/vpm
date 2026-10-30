'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const upstream=await import('./node_modules/path-expression-matcher/src/index.js'),vpm=require('../../packages/vpath-expression-matcher');
 const match=(lib,pattern,tags,attrs)=>{const m=new lib.Matcher();for(const t of tags)m.push(t);if(attrs)m.updateCurrent(attrs);return m.matches(new lib.Expression(pattern));};
 const cases=[
  ['zero-level deep wildcard',lib=>match(lib,'..item',['item']),false,true],
  ['root anchor',lib=>match(lib,'root..item',['other','root','item']),true,false],
  ['repeated anchor backtracking',lib=>match(lib,'a.b..c',['a','b','x','b','c']),false,true],
  ['separator in attribute value',lib=>{try{return match(lib,'item[url=a.b]',['item'],{url:'a.b'});}catch{return false;}},false,true],
  ['multi-character separator',lib=>{const m=new lib.Matcher();m.push('a');m.push('b');return m.matches(new lib.Expression('a=>b',{separator:'=>' }));},false,true],
  ['separator-aware set identity',lib=>new lib.ExpressionSet().add(new lib.Expression('a/b')).add(new lib.Expression('a/b',{separator:'/'})).size,1,2],
  ['inherited attribute',lib=>{const m=new lib.Matcher();m.push('item',Object.create({id:1}));return m.hasAttr('id');},true,false],
  ['namespace counter collision',lib=>{const m=new lib.Matcher();m.push('n:a');m.pop();m.push('a',null,'n');return m.getCounter();},1,0],
  ['mutable matcher escape',lib=>new lib.Matcher().readOnly()._matcher!==undefined,true,false],
  ['snapshot attribute alias',lib=>{const attrs={id:1},m=new lib.Matcher();m.push('a',attrs);const s=m.snapshot();attrs.id=2;return s.path[0].values.id;},2,1],
  ['mutable compiled pattern',lib=>{const e=new lib.Expression('a');try{e.segments[0].tag='b';}catch{}return e.segments[0].tag;},'b','a'],
  ['seal bypass',lib=>{const s=new lib.ExpressionSet().seal();s._sealed=false;try{s.add(new lib.Expression('a'));return true;}catch{return false;}},true,false],
  ['last selector rejection',lib=>{try{new lib.Expression('a:last');return false;}catch(e){return e instanceof SyntaxError;}},false,true],
 ];
 for(const [name,run,before,after]of cases){assert.equal(run(upstream),before,name+' upstream');assert.equal(run(vpm),after,name+' VPM');}
 console.log(`${cases.length} upstream/VPM matcher behavior discriminators passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
