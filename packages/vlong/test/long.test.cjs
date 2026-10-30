'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Long=require('..');
const bits=value=>(BigInt(value.unsigned?value.high>>>0:value.high)<<32n)|BigInt(value.low>>>0);
const wrap=(value,unsigned)=>unsigned?BigInt.asUintN(64,value):BigInt.asIntN(64,value);
function oracle(L){
  let seed=0x127bd982;const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed|0;};
  for(const unsigned of [false,true])for(let i=0;i<512;i++){
    const a=new L(next(),next(),unsigned),b=new L(next(),next(),unsigned),x=bits(a),y=bits(b);
    for(const [name,expected] of [['add',x+y],['subtract',x-y],['multiply',x*y],['and',x&y],['or',x|y],['xor',x^y]])assert.equal(bits(a[name](b)),wrap(expected,unsigned),name);
    assert.equal(bits(a.negate()),wrap(-x,unsigned));assert.equal(bits(a.not()),wrap(~x,unsigned));
    assert.equal(a.compare(b),x===y?0:x<y?-1:1);
    if(y){assert.equal(bits(a.divide(b)),wrap(x/y,unsigned));assert.equal(bits(a.modulo(b)),wrap(x%y,unsigned));}
    const n=BigInt(i%64),u=BigInt.asUintN(64,x);
    assert.equal(bits(a.shiftLeft(Number(n))),wrap(x<<n,unsigned));
    assert.equal(bits(a.shiftRight(Number(n))),wrap(BigInt.asIntN(64,x)>>n,unsigned));
    assert.equal(bits(a.shiftRightUnsigned(Number(n))),wrap(u>>n,unsigned));
    assert.equal(bits(a.rotateLeft(Number(n))),wrap((u<<n)|(u>>(64n-n)),unsigned));
    assert.equal(bits(a.rotateRight(Number(n))),wrap((u>>n)|(u<<(64n-n)),unsigned));
    for(const radix of [2,3,8,10,16,31,36]){
      const text=x.toString(radix);assert.equal(a.toString(radix),text);assert.equal(bits(L.fromString(text,unsigned,radix)),x);
    }
    assert.equal(bits(L.fromBytes(a.toBytes(),unsigned)),x);
  }
}
test('all arithmetic, shifts, rotations and radix conversions match an independent BigInt oracle',()=>oracle(Long));
test('arithmetic fallback remains correct when WebAssembly is unavailable',()=>{
  const context={module:{exports:{}},WebAssembly:undefined};vm.runInNewContext(fs.readFileSync(require.resolve('..'),'utf8'),context);
  oracle(context.module.exports);
});
test('signed and unsigned boundary strings retain modulo-64-bit behavior in every radix',()=>{
  for(const unsigned of [false,true])for(const x of [0n,1n,-1n,2n**53n-1n,2n**53n,-(2n**53n),2n**63n-1n,-(2n**63n),2n**64n-1n,2n**64n, -(2n**65n)]){
    for(let radix=2;radix<=36;radix++)assert.equal(bits(Long.fromString(x.toString(radix),unsigned,radix)),wrap(x,unsigned));
  }
});
test('invalid strings are rejected in full instead of parsing a prefix or replacing junk with zero',()=>{
  for(const s of ['', '+','-','1junk','12345678x2345678','1.5','1e3','1_000','1\n',' 1','1 ','--1','+-1','NaN','Infinity','+Infinity','-Infinity','0x10'])assert.throws(()=>Long.fromString(s));
  for(const s of ['2','1012','10x'])assert.throws(()=>Long.fromString(s,false,2));
  assert.throws(()=>Long.fromString('0x10',false,16));
  for(const value of [null,undefined,123,{},[],1n])assert.throws(()=>Long.fromString(value),TypeError);
  assert.equal(Long.fromString('+00123').toString(),'123');assert.equal(Long.fromString('AbCd',16).toString(16),'abcd');
});
test('radices must be integer numbers in range for parsing and formatting',()=>{
  for(const radix of [null,0,1,37,2.5,NaN,Infinity,'10',true,{}]){
    assert.throws(()=>Long.fromString('12',false,radix),RangeError);assert.throws(()=>Long.ONE.toString(radix),RangeError);
  }
});
test('long input wraps correctly without retaining unbounded intermediate BigInts',()=>{
  for(const radix of [2,10,16,36]){
    const text=(radix-1).toString(radix).repeat(10000);
    // base^n - 1, modulo 2^64, using independently bounded repeated squaring.
    let n=10000,b=BigInt(radix),p=1n;while(n){if(n&1)p=BigInt.asUintN(64,p*b);b=BigInt.asUintN(64,b*b);n>>>=1;}
    assert.equal(bits(Long.fromString(text,true,radix)),BigInt.asUintN(64,p-1n));
  }
});
test('small integer results are independently mutable and constants cannot be poisoned',()=>{
  for(const unsigned of [false,true])for(const value of [0,1,7,127,255,-1]){
    const a=Long.fromInt(value,unsigned),b=Long.fromInt(value,unsigned);assert.notEqual(a,b);
    const expected=bits(b);a.low=99;a.high=42;a.unsigned=!unsigned;assert.equal(bits(Long.fromInt(value,unsigned)),expected);
  }
  for(const name of ['ZERO','UZERO','ONE','UONE','NEG_ONE','MIN_VALUE','MAX_VALUE','MAX_UNSIGNED_VALUE']){
    assert(Object.isFrozen(Long[name]));assert.throws(()=>{Long[name].low=7;},TypeError);assert.throws(()=>{Long[name]={};},TypeError);
  }
  assert.equal(Long.ONE.add(2).toString(),'3');
});
test('byte constructors validate width and elements while respecting typed-array slices',()=>{
  const backing=Uint8Array.from([99,1,2,3,4,5,6,7,8,99]);const bytes=backing.subarray(1,9);
  assert.equal(Long.fromBytesBE(bytes).toString(16),'102030405060708');
  assert.equal(Long.fromBytesLE(bytes).toString(16),'807060504030201');
  assert.equal(Long.fromBytesLE(vm.runInNewContext('new Uint8Array([1,2,3,4,5,6,7,8])')).toString(16),'807060504030201');
  const hidden=Array(8).fill(0);hidden[3]=256;hidden[Symbol.iterator]=function*(){yield* Array(8).fill(0);};assert.throws(()=>Long.fromBytes(hidden),RangeError);
  for(const method of ['fromBytesLE','fromBytesBE']){const array=Array(8).fill(0),reads=Array(8).fill(0);for(let i=0;i<8;i++)Object.defineProperty(array,i,{get(){return ++reads[i]===1?i+1:256;}});assert.equal(Long[method](array).toString(16),method==='fromBytesLE'?'807060504030201':'102030405060708');assert.deepEqual(reads,Array(8).fill(1));}
  for(const bytes of [[],[1],new Uint8Array(9),new Uint8Array(7)])assert.throws(()=>Long.fromBytes(bytes),RangeError);
  for(const value of [-1,256,NaN,1.5,'1',undefined]){const bytes=Array(8).fill(0);bytes[3]=value;assert.throws(()=>Long.fromBytes(bytes),RangeError);}
  for(const bytes of [null,{},'12345678',new DataView(new ArrayBuffer(8))])assert.throws(()=>Long.fromBytes(bytes),TypeError);
});
test('number coercions and mixed signedness preserve the upstream API',()=>{
  assert.equal(Long.fromNumber(NaN).toString(),'0');assert.equal(Long.fromNumber(Infinity).toString(),'9223372036854775807');
  assert.equal(Long.fromNumber(-1,true).toString(),'0');assert.equal(Long.fromNumber(2.9).toString(),'2');
  assert.equal(Long.fromValue({low:-1,high:-1,unsigned:true}).toString(),'18446744073709551615');
  assert.equal(Long.fromValue(2n**64n+3n).toString(),'3');
  assert.throws(()=>Long.ONE.div(Long.ZERO),/zero/);
  for(const alias of ['eq','neq','lt','lte','gt','gte','comp','neg','sub','mul','div','mod','shl','shr','shru','rotl','rotr','eqz'])assert.equal(typeof Long.prototype[alias],'function',alias);
});
test('native ESM default import shares the CommonJS constructor',async()=>assert.equal((await import('../index.js')).default,Long));
