'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),fixture=path.join(root,'scripts/brace-expansion-conformance'),expand=require('..');
const controls=['brace-expansion','brace-app-current','brace-app'].map(name=>{const api=require(path.join(fixture,'node_modules',name));return api.expand||api;});
test('published Bash fixtures match all pinned controls',()=>{
 const cases=fs.readFileSync(fixture+'/fixtures/bash-results.txt','utf8').replaceAll('\r\n','\n').split('><><><><');cases.pop();
 for(const input of cases){const lines=input.split('\n'),pattern=lines.shift();let expected=lines.length===1&&lines[0]===''?[]:lines.map(s=>s.replace(/^\[|\]$/g,''));
  assert.deepEqual(expand(pattern),expected,JSON.stringify(pattern));for(const [i,reference] of controls.entries()){if(i&&/\{[^{}]*\.\.[^{}]*\.\.-?0\}/.test(pattern))continue;assert.deepEqual(expand(pattern),reference(pattern),JSON.stringify(pattern));}
 }
});
test('generated nested and malformed patterns preserve expansion order and escaping',()=>{
 const atoms=['','x','{}','{a,b}','{,a,,b,}','{01..05..2}','{3..-1}','{Z..b}','{a..d..0}','{x}','${a,b}','\\{a,b\\}','{a},b}','{a,{b,c}','{{a,b}}','{{1,2}..3}'];
 for(const a of atoms)for(const b of atoms)for(const c of ['', 'p','{,q}']){
  const pattern=a+b+c;assert.deepEqual(expand(pattern),controls[0](pattern),JSON.stringify(pattern));
 }
 let seed=641;const chars='{}{},ab.$\\';
 for(let i=0;i<5000;i++){let pattern='';for(let j=0;j<12;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pattern+=chars[seed%chars.length];}
  assert.deepEqual(expand(pattern),controls[0](pattern),JSON.stringify(pattern));
 }
});
test('historical empty-result behavior follows the current contract',()=>{
 const pattern='{.$}{}$}b},}';
 assert.deepEqual(expand(pattern),['.$}{}$}b}']);
 assert.deepEqual(controls[2](pattern),['.$}{}$}b}','']);
});
test('current exports and ordinary output caps',async()=>{
 const esm=await import('../index.mjs');assert.equal(esm.expand,expand);assert.equal(esm.default,expand);assert.equal(expand.EXPANSION_MAX,100000);
 const patterns=['{a,,b}','pre{,a}post','{a,b}{1..4}','{01..09..2}','{{a,b},{c,d}}','plain'];
 for(const pattern of patterns)for(const max of [0,1,2,3,5,10,Infinity])for(const maxLength of [0,1,3,10,50,Infinity])assert.deepEqual(expand(pattern,{max,maxLength}),controls[0](pattern,{max,maxLength}),JSON.stringify({pattern,max,maxLength}));
});
test('independent work bounds and strict input contract',()=>{
 for(const key of ['max','maxLength','maxDepth','maxRewrites','maxSteps'])assert.deepEqual(expand('x{1..3}',{[key]:NaN}),expand('x{1..3}'));
 assert.deepEqual(expand('a{1..3}',{maxSteps:0}),['a{1..3}']);
 assert.deepEqual(expand('{a,b}',{maxLength:1}),['a']);assert.deepEqual(expand('{a,b}',{max:0}),[]);
 assert.throws(()=>expand(1),TypeError);assert.throws(()=>expand('{}',{max:'3'}),TypeError);
 assert.deepEqual(expand('{9007199254740992..9007199254740994}'),['{9007199254740992..9007199254740994}']);
 assert.deepEqual(expand('\0OPEN,\ue000{a,b}'),['\0OPEN,\ue000a','\0OPEN,\ue000b']);
 assert.deepEqual(expand('\\{x\\}',{maxLength:3}),['{x}']);
});
test('deep nesting, chained products and malformed tails stay bounded',()=>{
 for(const pattern of ['{'.repeat(12000)+'a,b'+'}'.repeat(12000),'{a,b}'.repeat(3000),'{a}'+ '}'.repeat(40000)+',z}','{a,'+'{b,c}'.repeat(2000),'{'+','.repeat(50000)+'}']){
  const start=performance.now(),result=expand(pattern);assert(result.length<=expand.EXPANSION_MAX);assert(result.reduce((n,s)=>n+s.length,0)<=expand.EXPANSION_MAX_LENGTH);assert(performance.now()-start<5000,'bounded hostile pattern '+pattern.length);
 }
 const deep='{'.repeat(4000)+'a,b'+'}'.repeat(4000);assert.doesNotThrow(()=>expand(deep,{maxDepth:Infinity,maxSteps:100000}));
});
