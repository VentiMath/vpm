'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const api=require('..'),non=require('../non-secure.cjs'),engine=require('../engine.cjs');
test('default, custom, zero, large and secure URL IDs',()=>{
 const ids=new Set();for(let i=0;i<4000;i++){const id=api.nanoid();assert.match(id,/^[A-Za-z0-9_-]{21}$/);ids.add(id)}assert.equal(ids.size,4000);
 for(const size of [0,1,6,21,32768,32769,65537]){assert.equal(api.nanoid(size).length,size);assert.equal(api.customAlphabet('abc',size)().length,size)}
 assert.equal(api.customAlphabet('a',13)(),'a'.repeat(13));assert.equal(non.nanoid(6).length,6);
});
test('public byte arrays remain owned across subsequent calls and pool refills',()=>{
 const bytes=api.random(42),copy=Uint8Array.from(bytes);assert.equal(bytes.length,42);for(let i=0;i<50;i++)api.nanoid(1000);api.random(42).fill(0);assert.deepEqual(bytes,copy);assert.equal(api.random(0).length,0);
});
test('every accepted byte maps uniformly for odd alphabets',()=>{
 let source=0,calls=0;
 const next=api.customRandom('abc',255,n=>{calls++;return Uint8Array.from({length:n},()=>source++%256)});
 const counts={a:0,b:0,c:0};for(const c of next())counts[c]++;assert.deepEqual(counts,{a:85,b:85,c:85});assert.ok(calls>=1);
 assert.equal(api.customRandom('ab',6,n=>new Uint8Array(n).fill(255))(),'bbbbbb');
});
test('cryptographic fill is the sole entropy source and ranges are not reused',()=>{
 let calls=0,n=0;const secure=engine.createSecure(bytes=>{calls++;for(let i=0;i<bytes.length;i++)bytes[i]=n++%256;return bytes});
 const a=secure.nanoid(16),b=secure.nanoid(16);assert.notEqual(a,b);assert.equal(calls,1);secure.nanoid(4096);assert.equal(calls,2);
 assert.throws(()=>engine.createSecure(()=>{throw Error('entropy unavailable')}).nanoid(),/entropy unavailable/);
});
test('invalid input fails before allocation, looping or invoking a custom source',()=>{
 for(const size of [-1,1.2,NaN,Infinity,'3',null,1048577])for(const f of [api.nanoid,api.random,non.nanoid,api.customAlphabet('abc'),non.customAlphabet('abc')])assert.throws(()=>f(size),RangeError);
 for(const alphabet of ['', 'a'.repeat(257),'😀',null])for(const f of [api.customAlphabet,non.customAlphabet])assert.throws(()=>f(alphabet),TypeError);
 let invoked=false;assert.throws(()=>api.customRandom('a',-1,()=>{invoked=true}),RangeError);assert.equal(invoked,false);
 for(const source of [n=>[],n=>new Uint8Array(n+1),n=>new Int8Array(n),n=>null])assert.throws(()=>api.customRandom('ab',2,source)(),TypeError);
 assert.throws(()=>api.customRandom('abc',2,n=>new Uint8Array(n).fill(255))(),/no usable bytes/);
});
test('custom defaults and explicit size overrides',()=>{const f=api.customAlphabet('αβ',4);assert.match(f(),/^[αβ]{4}$/);assert.equal(f(2).length,2);assert.equal(f(0),'');assert.equal(non.customAlphabet('z')(),'z'.repeat(21));});
test('CJS and ESM expose the same API',async()=>{const m=await import('../index.mjs');assert.equal(m.nanoid,api.nanoid);assert.equal((await import('../non-secure.mjs')).nanoid,non.nanoid);assert.equal(api.urlAlphabet.length,new Set(api.urlAlphabet).size);});
test('pooled custom alphabets retain uniform rejection and Unicode mapping',()=>{
 const make=()=>{let position=0;return engine.createSecure(bytes=>{for(let i=0;i<bytes.length;i++)bytes[i]=position++%256;return bytes})};
 for(const alphabet of ['abc','αβγ']){const text=make().customAlphabet(alphabet,510)();assert.equal(text.length,510);for(const c of alphabet)assert.equal([...text].filter(x=>x===c).length,170)}
});
test('identifier boundaries consume the entropy stream exactly once',()=>{
 const make=()=>{let position=0;return engine.createSecure(bytes=>{for(let i=0;i<bytes.length;i++)bytes[i]=position++%256;return bytes},bytes=>Buffer.from(bytes).toString('latin1'),bytes=>Buffer.from(bytes).toString('base64url'),bytes=>Buffer.from(bytes).toString('hex'))};
 const split=make(),whole=make();assert.equal(split.nanoid(4090)+split.nanoid(12),whole.nanoid(4102));
 const h1=make().customAlphabet('0123456789abcdef'),h2=make().customAlphabet('0123456789abcdef');assert.equal(h1(4090)+h1(12),h2(4102));
});
