'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const number=require('..');
test('decimal roundtrip protects finite precision while preserving upstream exponent policy',()=>{
 for(const value of ['9007199254740993','20.211201030005811824','-0009007199254740993','1.0000000000000001'])assert.equal(number(value),value);
 for(const value of ['12','+0012','-0012','.006','1.2300','000.2300','+6.0','-0','-.0'])assert.equal(number(value),Number(value));
 assert.equal(number('420926189200190257681175017717'),4.209261892001902e29);assert.equal(number('9007199254740993e0'),9007199254740992);
});
test('overflow cannot bypass decimal syntax and exponent/leading-zero restrictions',()=>{
 for(const infinity of ['null','infinity','string']){
  for(const input of ['1e309','-1e309'])assert.equal(number(input,{eNotation:false,infinity}),input);
  for(const input of ['01e309','00'+ '9'.repeat(310)])assert.equal(number(input,{leadingZeros:false,infinity}),input);
 }
 for(const input of ['0x'+'f'.repeat(300),'0b'+'1'.repeat(1100),'0o'+'7'.repeat(400)]){
  const options={hex:true,binary:true,octal:true};assert.equal(number(input,options),input);assert.equal(number(input,{...options,infinity:'null'}),null);assert.equal(number(input,{...options,infinity:'infinity'}),Infinity);
 }
});
test('single zero is not a leading-zero prefix, including fractional exponents and signed zero',()=>{
 for(const input of ['-0','+0','0.1e2','-0.5E-2','+0.e4',' 0.25e2 '])assert.equal(number(input,{leadingZeros:false}),Number(input));
 for(const input of ['00','-01','00.1e2','01e2','00e2'])assert.equal(number(input,{leadingZeros:false}),input);
 assert.equal(number('00e2'),'00e2');
});
test('skipLike with global or sticky flags is repeatable and does not mutate caller state',()=>{
 for(const pattern of [/^12/g,/^12/y]){pattern.lastIndex=2;for(let i=0;i<4;i++){assert.equal(number('123',{skipLike:pattern}),'123');assert.equal(pattern.lastIndex,2);assert.equal(number('42',{skipLike:pattern}),42);assert.equal(pattern.lastIndex,2);}}
 const pattern={global:true,lastIndex:7,test(){throw Error('test failed');}};assert.throws(()=>number('1',{skipLike:pattern}),/test failed/);assert.equal(pattern.lastIndex,7);
});
test('options use only own fields and stay live between calls',()=>{
 const inherited=Object.create({hex:false,unicode:true,skipLike:/.*/});assert.equal(number('0x10',inherited),16);assert.equal(number('१२',inherited),'१२');
 const options={hex:false};assert.equal(number('0x10',options),'0x10');options.hex=true;assert.equal(number('0x10',options),16);
 assert.equal(number('1e309',{infinity:null}),'1e309');assert.equal(number('1e309',{infinity:'INFINITY'}),Infinity);
 assert.throws(()=>number('1',42),TypeError);assert.throws(()=>number('1',{skipLike:null}),TypeError);assert.equal(number('1',null),1);
});
test('Unicode is opt in and rejection returns the original text',()=>{
 for(const input of ['１２','𑯱𑯲','𑧐𑧑']){assert.equal(number(input),input);}
 assert.equal(number('−１２.５',{unicode:true}),-12.5);assert.equal(number(' १२x ',{unicode:true}),' १२x ');assert.equal(number(' １e１０００ ',{unicode:true}),' １e１０００ ');
 assert.equal(number(String.fromCodePoint(0x11de1,0x11de2),{unicode:true}),12);
});
test('invalid grammar and all non-string values preserve their identity',()=>{
 for(const value of ['', ' ','.','+.','-.','1e','1e+','0x','0xzz','1\n2','NaN','0X10','+0b1','0b2','0o8','0.0.1','12px','１．２',undefined,null,NaN,1n,{},Symbol('x')])assert.equal(number(value),value);
});
test('long numeric and malformed input remains bounded and never produces NaN',()=>{
 for(const text of ['0'.repeat(100000)+'x','0'.repeat(100000)+'.5','1.'+'0'.repeat(100000)+'1','1e'+'9'.repeat(100000)]){const result=number(text);assert.equal(Number.isNaN(result),false);}
});
test('retained upstream tests for both packages',async()=>{await require('../../../scripts/numbers-conformance/run.cjs')(false);});
