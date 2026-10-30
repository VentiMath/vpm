'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),v=require('..');
test('stateful custom expressions are repeatable without changing caller state',()=>{
 for(const flags of ['g','y','gy'])for(const frozen of [false,true])for(const list of [false,true]){
  const pattern=new RegExp('danger',flags);pattern.lastIndex=3;if(frozen)Object.freeze(pattern);
  const context=list?[{id:'test',description:'custom',pattern}]:pattern;
  for(let i=0;i<3;i++){
   assert.equal(v.isUnsafe('danger',context),true);assert.equal(v.whyUnsafe('danger',context).pattern,pattern);
   assert.equal(v.allUnsafe('danger',context).length,1);assert.equal(v.isUnsafe('clear',context),false);assert.equal(pattern.lastIndex,3);
  }
 }
});
test('built-in contexts and returned patterns cannot poison later checks',()=>{
 assert.ok(Object.isFrozen(v.HTML));assert.ok(Object.isFrozen(v.HTML[0]));assert.ok(Object.isFrozen(v.VALID_CONTEXTS));
 assert.throws(()=>v.HTML.pop(),TypeError);assert.throws(()=>{v.HTML[0].id='other';},TypeError);
 const source=v.HTML[0].pattern.source;v.HTML[0].pattern.compile('never-match-this');
 const found=v.whyUnsafe('<script>',v.HTML);found.pattern.compile('never-match-this');
 assert.equal(v.HTML[0].pattern.source,source);assert.equal(v.isUnsafe('<script>',v.HTML),true);
 assert.equal(v.allUnsafe('<script>',v.HTML)[0].id,'html-script-open');
});
test('validates all custom contexts before an early match, observes later edits',()=>{
 const rule={id:'a',description:'first',pattern:/a/};
 for(const context of [[rule,null],[rule,{id:'b',description:'bad',pattern:'a'}],[[rule],[]],[v.HTML,[{}]],[rule,v.HTML]])assert.throws(()=>v.isUnsafe('<script>a',context),TypeError);
 const list=[rule];list.label='OURS';assert.equal(v.whyUnsafe('a',list).context,'OURS');
 rule.pattern=/b/;assert.equal(v.isUnsafe('a',list),false);assert.equal(v.isUnsafe('b',list),true);
});
test('ordering, duplicates and built-in sources match all result APIs',()=>{
 const lists=[v.HTML,v.XML,v.HTML];
 for(const value of ['plain text','<script onclick="x">','<!DOCTYPE x><!--comment-->','<?php ?>']){
  const all=v.allUnsafe(value,lists),first=v.whyUnsafe(value,lists);
  assert.equal(v.isUnsafe(value,lists),all.length>0);assert.deepEqual(first,all[0]??null);
 }
 assert.equal(v.default,v.isUnsafe);
});
test('retained XML helper suites',async()=>{await require('../../../scripts/xml-helpers-conformance/run.cjs')();});
