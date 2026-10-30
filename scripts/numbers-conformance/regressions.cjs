'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const any=(await import('anynum')).default,number=(await import('strnum')).default;
 const vany=require('../../packages/vanynum'),vnumber=require('../../packages/vstrnum');
 // The upstream hand-maintained list omits longstanding BMP ranges as well as recent additions.
 const fs=require('node:fs'),path=require('node:path');
 const data=fs.readFileSync(path.join(__dirname,'upstream/unicode/DerivedNumericType.txt'),'utf8');
 let omitted=0;
 for(const m of data.matchAll(/^([A-F0-9]+)\.\.([A-F0-9]+)\s+; Decimal /gm))for(let cp=parseInt(m[1],16);cp<=parseInt(m[2],16);cp++){
  const char=String.fromCodePoint(cp),expected=String((cp-parseInt(m[1],16))%10);assert.equal(vany(char),expected);if(any(char)!==expected)omitted++;
 }
 assert.ok(omitted>0);
 assert.equal(number('1e309',{eNotation:false,infinity:'null'}),null);assert.equal(vnumber('1e309',{eNotation:false,infinity:'null'}),'1e309');
 assert.equal(number('01e309',{leadingZeros:false,infinity:'null'}),null);assert.equal(vnumber('01e309',{leadingZeros:false,infinity:'null'}),'01e309');
 const huge='0x'+'f'.repeat(300);assert.equal(number(huge),Infinity);assert.equal(vnumber(huge),huge);
 for(const input of ['-0','+0','0.1e2']){assert.equal(number(input,{leadingZeros:false}),input);assert.equal(vnumber(input,{leadingZeros:false}),Number(input));}
 const pattern=/^12/g;assert.equal(number('123',{skipLike:pattern}),'123');assert.equal(number('123',{skipLike:pattern}),123);
 pattern.lastIndex=1;assert.equal(vnumber('123',{skipLike:pattern}),'123');assert.equal(pattern.lastIndex,1);
 const options=JSON.parse('{"__proto__":{}}');options.__proto__.skipLike=/.*/;
 assert.equal(number('42',options),'42');assert.equal(vnumber('42',options),42);
 console.log(`Confirmed ${omitted} omitted Unicode decimal digits; overflow option bypasses, radix overflow, signed-zero/fractional-exponent rejection, mutable skipLike and injected option prototype.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
