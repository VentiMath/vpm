'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),define=require(process.env.VPM_LAZY_PACKAGE||'../index.cjs');
test('first read initializes once; subsequent reads and assignments are plain data',()=>{
 let calls=0;const object={};assert.equal(define(object,'value',()=>{calls++;return {n:4}}),object);assert.equal(calls,0);
 assert.deepEqual(Object.keys(object),['value']);const before=Object.getOwnPropertyDescriptor(object,'value');assert.equal(typeof before.get,'function');assert.equal(before.configurable,true);
 const result=object.value;assert.equal(object.value,result);assert.equal(calls,1);assert.deepEqual(Object.getOwnPropertyDescriptor(object,'value'),{value:result,writable:true,enumerable:true,configurable:true});object.value=5;assert.equal(object.value,5);
});
test('assignment bypasses initialization, including undefined; promises and objects retain identity',()=>{
 for(const value of [undefined,null,false,0,NaN,{},Promise.resolve(2)]){let calls=0;const object=define({},'value',()=>{calls++;return value});object.value=value;assert.equal(object.value,value);assert.equal(calls,0);const read=define({},'value',()=>value);assert.equal(read.value,value);assert.equal(read.value,value);}
});
test('failure retries, deletion cancels work and receiver semantics retain the owning object',()=>{
 let calls=0;const error=new Error('retry'),parent=define({},'value',()=>{if(++calls===1)throw error;return calls});assert.throws(()=>parent.value,e=>e===error);assert.equal(parent.value,2);
 const removed=define({},'value',()=>{throw Error('should not run')});delete removed.value;assert.equal(removed.value,undefined);
 const owner=define({},'value',()=>5),child=Object.create(owner);child.value=7;assert.equal(owner.value,7);assert.equal(Object.hasOwn(child,'value'),false);
});
test('symbols, null prototypes and __proto__ are ordinary own keys; initializer is unbound',()=>{
 const key=Symbol();let receiver='unset',argc;const object=define(Object.create(null),key,function(){receiver=this;argc=arguments.length;return 4});assert.equal(object[key],4);assert.equal(receiver,undefined);assert.equal(argc,0);
 const plain=define({},'__proto__',()=>9);assert.equal(plain.__proto__,9);assert.equal(Object.getPrototypeOf(plain),Object.prototype);
});
test('descriptor changes during initialization preserve configurability rules and original errors',()=>{
 const a={};define(a,'v',()=>{Object.defineProperty(a,'v',{value:3,writable:true,enumerable:true,configurable:false});return 7});assert.equal(a.v,7);assert.equal(Object.getOwnPropertyDescriptor(a,'v').configurable,false);
 const b=define({},'v',()=>4);Object.seal(b);assert.throws(()=>b.v,TypeError);assert.throws(()=>define(Object.freeze({}),'v',()=>1),TypeError);
 const c=define({},'v',1);assert.throws(()=>c.v,TypeError);c.v=2;assert.equal(c.v,2);
});
