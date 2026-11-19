'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),D=require(process.env.VDECKO_ENTRY||'../index.cjs');
const apply=(decorator,proto,key)=>{const desc=Object.getOwnPropertyDescriptor(proto,key);Object.defineProperty(proto,key,decorator(proto,key,desc)||desc)};
function clock(run) {const old=global.setTimeout,queue=[];global.setTimeout=(fn,delay)=>{queue.push({fn,delay});return 0};try{run(queue)}finally{global.setTimeout=old}}
test('bind functions, factory decorators, symbols, inherited methods and lazy identity',()=>{
 const receiver={id:1};assert.equal(D.bind(function(){return this},receiver).call({}),receiver);
 for(const factory of [false,true]) {const key=Symbol('method'),proto={[key](n){return this.id+n}};apply(factory?D.bind():D.bind,proto,key);const a=Object.assign(Object.create(proto),{id:2}),b=Object.assign(Object.create(proto),{id:7});const f=a[key];assert.equal(f(3),5);assert.equal(f,a[key]);assert.notEqual(f,b[key]);assert.equal(b[key](3),10);assert.equal(Object.getOwnPropertyDescriptor(a,key).enumerable,false);a[key]=()=>20;assert.equal(a[key](),20);}
});
test('memoization uses stringified first argument, shared cache and caches undefined',()=>{
 let calls=0;const f=D.memoize(function(key,extra){calls++;return {self:this,key,extra}}),ctx={};const first=f.call(ctx,1,2);assert.equal(f('1',9),first);assert.equal(first.self,ctx);assert.equal(calls,1);
 const u=D.memoize(()=>{calls++});u();u();u('');u('');assert.equal(calls,3);
 const proto={m(k){return this.id+k}};apply(D.memoize,proto,'m');const a=Object.assign(Object.create(proto),{id:'a'}),b=Object.assign(Object.create(proto),{id:'b'});assert.equal(a.m('k'),'ak');assert.equal(b.m('k'),'ak');
});
test('memoization options, seeds, symbols and exceptional results',()=>{
 const cache={seed:42},f=D.memoize(x=>x,{cache,caseSensitive:false});assert.equal(f('SEED'),42);assert.equal(f('Hello'),'Hello');assert.equal(f('HELLO'),'Hello');assert.equal(cache.hello,'Hello');
 const a=Symbol('key'),b=Symbol('key');assert.equal(f(a),a);assert.equal(f(b),a);
 let n=0;const g=D.memoize(()=>{if(!n++)throw Error('retry');return 7});assert.throws(()=>g('x'),/retry/);assert.equal(g('x'),7);
 const proto={m(x){return x}};apply(D.memoize({caseSensitive:false}),proto,'m');assert.equal(proto.m('ABC'),proto.m('abc'));
});
test('prototype-looking keys are real cache entries without changing supplied cache prototype',()=>{
 for(const cache of [{},Object.create(null)]){const before=Object.getPrototypeOf(cache);let count=0;const f=D.memoize(()=>({count:++count}),{cache});for(const key of ['__proto__','constructor','toString','hasOwnProperty']){assert.equal(f(key),f(key));assert(Object.hasOwn(cache,key));}assert.equal(count,4);assert.equal(Object.getPrototypeOf(cache),before);}
});
test('debounce coalesces latest receiver/arguments at the original window, not a reset delay',()=>clock(queue=>{
 for(const make of [fn=>D.debounce(fn),fn=>D.debounce(fn,5),fn=>D.debounce(5,fn),fn=>D.debounce(fn,{delay:5}),fn=>D.debounce({delay:5},fn)]){const values=[],fn=make(function(...args){values.push([this,args])}),a={},b={};assert.equal(fn.call(a,1),undefined);fn.call(b,2,3);assert.equal(queue.length,1);queue.shift().fn();assert.deepEqual(values,[[b,[2,3]]]);}
}));
test('bare and configured debounce decorators preserve descriptor flags and shared window',()=>clock(queue=>{
 for(const dec of [D.debounce,D.debounce(),D.debounce(7),D.debounce({delay:7})]){const calls=[],proto={m(x){calls.push([this.id,x])}};apply(dec,proto,'m');const a=Object.assign(Object.create(proto),{id:'a'}),b=Object.assign(Object.create(proto),{id:'b'});a.m(1);b.m(2);assert.equal(queue.length,1);queue.shift().fn();assert.deepEqual(calls,[['b',2]]);assert(Object.getOwnPropertyDescriptor(proto,'m').enumerable);}
}));
test('recursive calls and exceptions do not lose later windows',()=>clock(queue=>{
 const seen=[],f=D.debounce(n=>{seen.push(n);if(n===1)f(2)});f(1);queue.shift().fn();assert.equal(queue.length,1);queue.shift().fn();assert.deepEqual(seen,[1,2]);
 let count=0;const g=D.debounce(()=>{if(!count++)throw Error('callback')});g();assert.throws(()=>queue.shift().fn(),/callback/);g();assert.equal(queue.length,1);queue.shift().fn();assert.equal(count,2);
}));
test('real timer runs once with the final call',async()=>{const values=[];const f=D.debounce(x=>values.push(x),1);f(1);f(2);await new Promise(r=>setTimeout(r,30));assert.deepEqual(values,[2]);});
