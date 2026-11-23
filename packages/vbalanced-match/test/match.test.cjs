'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const balanced=require('..'),{range}=balanced;
const controls=['balanced-match','balanced-v4','balanced-app'].map(n=>{const api=require('../../../scripts/balanced-match-conformance/node_modules/'+n);return api.balanced||api;});
test('current named exports and legacy callable surface share one implementation',async()=>{
 const esm=await import('../index.mjs');assert.equal(esm.balanced,balanced);assert.equal(esm.default,balanced);assert.equal(esm.range,range);
 assert.deepEqual(balanced('{','}','pre{in{nested}}post'),{start:3,end:14,pre:'pre',body:'in{nested}',post:'post'});
 assert.deepEqual(range('{','}','{{{a}b}'),[1,6]);
 assert.deepEqual(range('aa','ab','aaab'),[1,2]);assert.deepEqual(range('a','aa','aaaaa'),[1,1]);
 assert.deepEqual(range('ab','ab','abab'),[0,2]);
});
test('all short brace strings and overlapping delimiters match pinned controls',()=>{
 let count=0;
 const sets=[['{','}','{}x'],['aa','ab','abx'],['a','aa','abx'],['ab','ab','abx'],['<b>','</b>',['<b>','</b>','x']]];
 for(const [open,close,alphabet]of sets){
  let values=[''];
  for(let length=0;length<=7;length++){
   for(const source of values){for(const control of controls)assert.deepEqual(balanced(open,close,source),control(open,close,source),JSON.stringify([open,close,source]));count++;}
   values=values.flatMap(s=>Array.from(alphabet,c=>s+c));
  }
 }
 assert.equal(count,16400);
});
test('regex delimiters resolve once, respect flags and work across realms',()=>{
 const source='pre  {   in{nest}   }  post';
 for(const control of controls)assert.deepEqual(balanced(/\s+\{\s+/,/\s+\}\s+/,source),control(/\s+\{\s+/,/\s+\}\s+/,source));
 assert.deepEqual(balanced(vm.runInNewContext('/\\{/'),vm.runInNewContext('/\\}/'),'a{x}'),balanced('{','}','a{x}'));
 const a=/\{/g,b=/\}/g;a.lastIndex=2;b.lastIndex=2;assert.equal(balanced(a,b,'a{x}').body,'x');assert.equal(a.lastIndex,0);assert.equal(b.lastIndex,0);
 assert.equal(balanced(/missing/,/\}/,'{x}'),undefined);
});
test('empty delimiters have no match; invalid types are rejected; deep nesting does not recurse',()=>{
 for(const [a,b]of [['','}'],['{',''],['',''],[/^/,'}']])assert.equal(balanced(a,b,'{x}'),undefined);
 assert.throws(()=>balanced({},'}','{}'),TypeError);assert.throws(()=>range('{','}',null),TypeError);
 assert.deepEqual(range('{','}','{'.repeat(100000)+'x'+'}'.repeat(100000)),[0,200000]);
 assert.deepEqual(range('{','}','{'.repeat(100000)+'x}'),[99999,100001]);
 assert.equal(balanced('🟢','🔴','a🟢b🟢c🔴d🔴z').body,'b🟢c🔴d');
});
