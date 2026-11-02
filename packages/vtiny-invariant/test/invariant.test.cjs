'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require.resolve('..'),'utf8');
function load(mode){const context={module:{exports:{}},process:{env:{NODE_ENV:mode}},Error};vm.runInNewContext(source,context);return {invariant:context.module.exports,context}}
test('all JS truthiness values, including BigInt and objects, preserve assertions',()=>{
 for(const mode of ['development','production',undefined]){
  const {invariant}=load(mode);for(const value of [false,0,-0,0n,'',null,undefined,NaN])assert.throws(()=>invariant(value),Error);
  for(const value of [true,1,-1,1n,'0',[],{},Symbol(),()=>{}])assert.equal(invariant(value),undefined);
  assert.doesNotThrow(()=>invariant({valueOf(){throw Error('coercion')}}));
 }
});
test('lazy diagnostics are evaluated once, only for a development failure',()=>{
 for(const mode of ['development','production']){
  const {invariant}=load(mode);let calls=0;const message=()=>{calls++;return 'detail'};
  invariant(true,message);assert.equal(calls,0);assert.throws(()=>invariant(false,message),{message:mode==='production'?'Invariant failed':'Invariant failed: detail'});assert.equal(calls,mode==='production'?0:1);
 }
});
test('empty diagnostics, message exceptions and cached environment retain the contract',()=>{
 const {invariant,context}=load('development');context.process.env.NODE_ENV='production';
 assert.throws(()=>invariant(false,'detail'),{message:'Invariant failed: detail'});
 for(const message of ['',undefined,()=> ''])assert.throws(()=>invariant(false,message),{message:'Invariant failed'});
 const error=new Error('message creation');assert.throws(()=>invariant(false,()=>{throw error}),e=>e===error);
});
test('native ESM and CJS expose the same callable',async()=>assert.equal((await import('../index.mjs')).default,require('..')));
