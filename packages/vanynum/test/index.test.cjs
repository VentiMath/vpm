'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const anynum=require('..');
const data=fs.readFileSync(path.resolve(__dirname,'../../../scripts/numbers-conformance/upstream/unicode/DerivedNumericType.txt'),'utf8');
const ranges=[...data.matchAll(/^([A-F0-9]+)\.\.([A-F0-9]+)\s+; Decimal /gm)].map(m=>[parseInt(m[1],16),parseInt(m[2],16)]);
test('every pinned decimal digit maps to its value, including every range boundary',()=>{
 let digits=0;
 for(const [start,end]of ranges){let input='',expected='';for(let cp=start;cp<=end;cp++){input+=String.fromCodePoint(cp);expected+=(cp-start)%10;digits++;}assert.equal(anynum(input),expected);assert.equal(anynum(String.fromCodePoint(start-1)),String.fromCodePoint(start-1));assert.equal(anynum(String.fromCodePoint(end+1)),String.fromCodePoint(end+1));}
 assert.equal(digits,770);
});
test('all other code points pass through without accidental conversion',()=>{
 const points=new Set(ranges.flatMap(([a,b])=>Array.from({length:b-a+1},(_,i)=>a+i)));for(const cp of [0x2212,0xff0d,0xfe63])points.add(cp);
 for(let start=0;start<=0x10ffff;start+=2048){let text='';for(let cp=start;cp<Math.min(start+2048,0x110000);cp++)if(!points.has(cp))text+=String.fromCodePoint(cp);assert.equal(anynum(text),text);assert.equal(anynum('१'+text),'1'+text);}
});
test('sign normalization does not normalize punctuation or decimal separators',()=>{
 assert.equal(anynum('−４２ －१२ ﹣٣ –४ —५ ‐६'),'‑42 -12 -3 –4 —5 ‐6'.replace('‑','-'));
 assert.equal(anynum('٣٫١٤，３．１４'),'3٫14，3．14');
});
test('preserves unpaired surrogates and supplementary non-digits among converted text',()=>{
 for(const text of ['\ud800','\udc00','\ud800A\udc00','😀','𠀀']){assert.equal(anynum(text),text);assert.equal(anynum('९'+text+'𝟞'),'9'+text+'6');}
});
test('nonstrings pass through without coercion',()=>{for(const value of [null,undefined,NaN,1n,{},[],Symbol('x'),new String('१२')])assert.equal(anynum(value),value);assert.equal(anynum.anynum,anynum);});
test('long mixed and ASCII-only text',()=>{assert.equal(anynum('text 1234 '.repeat(10000)),'text 1234 '.repeat(10000));assert.equal(anynum('१२3𝟜−hello '.repeat(10000)),'1234-hello '.repeat(10000));});
