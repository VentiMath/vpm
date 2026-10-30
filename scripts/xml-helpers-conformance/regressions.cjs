'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const x=await import('./node_modules/xml-naming/src/index.js'),v=require('../../packages/vxml-naming');
 let fixes=0;
 for(const [label,operation,before,after]of [
  ['supplementary XML 1.0',lib=>lib.name('𐀀'),false,true],
  ['U+0487 start',lib=>lib.name('\u0487'),false,true],
  ['multiplication sign XML 1.1',lib=>lib.name('×',{xmlVersion:'1.1'}),true,false],
  ['division sign XML 1.1',lib=>lib.name('÷',{xmlVersion:'1.1'}),true,false],
  ['normalized token separators',lib=>lib.nmTokens('a\u00a0b'),true,false],
  ['QName component diagnostic',lib=>lib.validate('a:1','qName').position,undefined,2],
  ['invalid QName sanitizer',lib=>lib.qName(lib.sanitize(':1','qName')),false,true],
  ['surrogate sanitizer',lib=>lib.name(lib.sanitize('\ud800')),false,true],
 ]){assert.equal(operation(x),before,label+' upstream');assert.equal(operation(v),after,label+' VPM');fixes++;}
 assert.equal(x.name(undefined),true);assert.throws(()=>v.name(undefined),TypeError);fixes++;
 x.createValidator('name',{maxCacheSize:Infinity});assert.throws(()=>v.createValidator('name',{maxCacheSize:Infinity}),RangeError);fixes++;
 const u=await import('./node_modules/is-unsafe/src/index.js'),w=require('../../packages/vis-unsafe');
 for(const flags of ['g','y']){
  const old=new RegExp('danger',flags),next=new RegExp('danger',flags);
  assert.equal(u.isUnsafe('danger',old),true);assert.equal(u.isUnsafe('danger',old),false);
  assert.equal(w.isUnsafe('danger',next),true);assert.equal(w.isUnsafe('danger',next),true);assert.equal(next.lastIndex,0);fixes++;
 }
 const bad=[{id:'a',description:'a',pattern:/a/},{}];assert.equal(u.isUnsafe('a',bad),true);assert.throws(()=>w.isUnsafe('a',bad),TypeError);fixes++;
 const original=u.HTML[0].pattern;try{u.HTML[0].pattern=/never/;assert.equal(u.isUnsafe('<script>',u.HTML),false);}finally{u.HTML[0].pattern=original;}
 const snapshot=w.HTML[0].pattern;snapshot.compile('never');assert.equal(w.isUnsafe('<script>',w.HTML),true);fixes++;
 // Compare the optimized boolean scanners with every retained individual rule.
 let seed=0x12345678;const alphabet='aA<>!?&;:=/-\n\t()[]scriptSYSTEMxmlns0123';
 for(let n=0;n<10000;n++){
  let text='';for(let j=0;j<n%100;j++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;text+=alphabet[seed%alphabet.length];}
  for(const label of ['HTML','XML']){
   const expected=u[label].some(rule=>rule.pattern.test(text));assert.equal(w.isUnsafe(text,w[label]),expected,label);
   assert.deepEqual(w.allUnsafe(text,w[label]),u.allUnsafe(text,u[label]));
  }
 }
 console.log(`${fixes} upstream/VPM behavior discriminators and 20,000 seeded scanner comparisons passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
