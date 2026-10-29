'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const extend=require('..'),upstream=require('../../../scripts/consumers/node_modules/extend');
test('shallow API, target coercion, undefined values, arrays and function targets',()=>{
  const target={a:1};assert.equal(extend(target,{b:2}),target);assert.deepEqual(target,{a:1,b:2});
  for(const args of [[],[null,{a:1}],[true,null,{a:1}],[false,{},'abc'],[{},null,undefined,{a:undefined,b:null}],[[],[1,2],[3]],[true,{}, {a:[1,2]}, {a:[3]}]])assert.deepEqual(extend(...args),upstream(...args));
  const fn=()=>{};assert.equal(extend(fn,{field:3}),fn);assert.equal(fn.field,3);
});
test('deep merges preserve array index semantics and opaque native values',()=>{
  const opaque=[new Date(),Buffer.from('abc'),new Map(),/a/,new URL('https://example.test')];class Custom{}opaque.push(new Custom());
  const original={x:{a:1,list:[{x:1},2]},opaque};const result=extend(true,{},original,{x:{b:2,list:[{y:2}]}});
  assert.deepEqual(result.x,{a:1,b:2,list:[{x:1,y:2},2]});assert.notEqual(result.x,original.x);for(let i=0;i<opaque.length;i++)assert.equal(result.opaque[i],opaque[i]);assert.deepEqual(original.x.list,[{x:1},2]);
});
test('copies only own enumerable keys, including symbols',()=>{
  const symbol=Symbol('key'),source=Object.assign(Object.create({inherited:1}),{own:2,[symbol]:3});Object.defineProperty(source,'hidden',{value:4});const result=extend(true,{},source);assert.deepEqual(result,{own:2,[symbol]:3});
});
test('does not follow inherited target objects, constructors or setters',()=>{
  const proto={nested:{original:1}};let calls=0;Object.defineProperty(proto,'field',{set(){calls++;}});const target=Object.create(proto);
  extend(true,target,{nested:{added:2},field:3,constructor:{prototype:{polluted:true}}});assert.deepEqual(proto.nested,{original:1});assert.deepEqual(target.nested,{added:2});assert.equal(calls,0);assert.equal(target.field,3);assert.equal({}.polluted,undefined);
});
test('__proto__ is an ordinary own property and cannot pollute Object.prototype',()=>{
  const source=JSON.parse('{"__proto__":{"polluted":true}}');const result=extend(true,{},source);assert.equal(Object.getPrototypeOf(result),Object.prototype);assert.equal({}.polluted,undefined);assert(Object.hasOwn(result,'__proto__'));assert.deepEqual(result.__proto__,{polluted:true});
});
test('handles cycles, shared references and deep inputs without recursive overflow',()=>{
  const source={};source.self=source;source.a={x:1};source.b=source.a;const out=extend(true,{},source);assert.equal(out.self,out);assert.equal(out.a,out.b);assert.notEqual(out.a,source.a);
  const root={};let cursor=root;for(let i=0;i<10000;i++)cursor=cursor.next={};const copy=extend(true,{},root);cursor=copy;let count=0;while(cursor.next){count++;cursor=cursor.next;}assert.equal(count,10000);
});
test('reads getters once and skips keys removed before they are copied',()=>{
  let reads=0;const source={get first(){reads++;delete this.second;return 3;},second:4};Object.setPrototypeOf(source,{second:9});const result=extend({},source);assert.deepEqual(result,{first:3});assert.equal(reads,1);
});
test('null-prototype and cross-realm records are copied, spoofed class tags are not',()=>{
  const vm=require('node:vm'),record=vm.runInNewContext('({x:{value:1}})');const copied=extend(true,{},record);assert.notEqual(copied.x,record.x);
  const nil=Object.assign(Object.create(null),{x:{a:1}});assert.deepEqual(extend(true,{},nil),{x:{a:1}});
  class Fake{get [Symbol.toStringTag](){return 'Object';}}const fake=new Fake();assert.equal(extend(true,{}, {fake}).fake,fake);
});
test('native write errors and own setters remain observable',()=>{
  assert.throws(()=>extend(Object.freeze({a:1}),{a:2}),TypeError);let value;const target={set a(v){value=v;}};extend(target,{a:2});assert.equal(value,2);
});
test('differential generated acyclic own-data merges',()=>{
  let seed=7;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
  function make(depth){const value={};for(let i=0;i<4;i++)value['k'+i]=depth&&random()<0.5?make(depth-1):Math.floor(random()*100);return value;}
  for(let i=0;i<500;i++){const a=make(2),b=make(2);assert.deepEqual(extend(true,{},a,b),upstream(true,{},a,b));}
});
test('CommonJS and native ESM default exports agree',async()=>{assert.equal((await import('../index.js')).default,extend);});
test('memo promotion preserves early aliases, later aliases and root cycles',()=>{
  const source={};for(let i=0;i<32;i++)source['k'+i]={value:i};source.first=source.k0;source.last=source.k31;source.k31.root=source;
  const result=extend(true,{},source);assert.equal(result.first,result.k0);assert.equal(result.last,result.k31);assert.equal(result.k31.root,result);assert.notEqual(result.k0,source.k0);
});
test('tail descent resumes every ancestor and preserves depth-first getters',()=>{
  const order=[],source={a:{get x(){order.push('x');return {get y(){order.push('y');return 1;}};},get z(){order.push('z');return 2;}},get b(){order.push('b');return 3;}};
  assert.deepEqual(extend(true,{},source),{a:{x:{y:1},z:2},b:3});assert.deepEqual(order,['x','y','z','b']);
});
test('source enumeration stays snapshotted across getter mutations',()=>{
  const symbol=Symbol('key'),source={get first(){Object.defineProperty(this,'second',{enumerable:false});this.added=3;this[symbol]=4;return 1;},second:2};
  assert.deepEqual(extend({},source),{first:1,second:2});
});
test('proxy target ownership traps retain descriptor-before-has ordering',()=>{
  const log=[],object={own:0},target=new Proxy(object,{getOwnPropertyDescriptor(object,key){log.push('own:'+key);return Reflect.getOwnPropertyDescriptor(object,key);},has(object,key){log.push('has:'+key);return Reflect.has(object,key);},set(object,key,value){log.push('set:'+key);object[key]=value;return true;}});
  extend(target,{own:1,new:2});assert.deepEqual(log,['own:own','set:own','own:new','has:new','set:new']);assert.deepEqual(object,{own:1,new:2});
});
test('reused nested proxy targets retain the slow assignment contract',()=>{
  const log=[],child=new Proxy({value:0},{getOwnPropertyDescriptor(object,key){log.push('own:'+key);return Reflect.getOwnPropertyDescriptor(object,key);},has(){throw Error('own assignment must not query has');},set(object,key,value){log.push('set:'+key);object[key]=value;return true;}});
  const result=extend(true,{child},{child:{value:1}});assert.equal(result.child,child);assert.deepEqual(log,['own:value','set:value']);assert.equal(child.value,1);
});
