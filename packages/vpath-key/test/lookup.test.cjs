"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const own=require(process.env.VPM_PATH_KEY_ENTRY||'../index.cjs');
const fixture=path.resolve(__dirname,'../../../scripts/path-key-conformance/node_modules');
test('matches current and app controls across 16 casings, platform defaults and 8192 generated environments',async()=>{
 const current=(await import(fixture+'/path-key/index.js')).default,app=require(fixture+'/path-key-app');
 const casings=Array.from({length:16},(_,mask)=>[...'path'].map((c,i)=>mask&(1<<i)?c.toUpperCase():c).join(''));
 let seed=12345;
 for(let n=0;n<8192;n++){
  const env=n%2?Object.create(null):{};
  for(let i=0;i<n%23;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;env[seed%3?'OTHER_'+i:casings[seed%16]]='synthetic';}
  if(n%4===0)env[casings[n%16]]=undefined;
  const options={env,platform:['win32','linux','darwin','freebsd'][n%4]};
  assert.equal(own(options),current(options));assert.equal(own(options),app(options));
 }
 for(const key of casings)assert.equal(own({platform:'win32',env:{[key]:''}}),key);
 assert.equal(own(),current());
});
test('last own enumerable spelling wins; no values are read or keys modified',()=>{
 const env=Object.create({PATH:'inherited'});
 Object.defineProperty(env,'path',{value:'hidden'});
 Object.defineProperty(env,'PaTh',{enumerable:true,get(){throw Error('must not read value')}});
 env.OTHER='x';env.Path=undefined;
 const before=Object.getOwnPropertyDescriptors(env);
 assert.equal(own({env,platform:'win32'}),'Path');
 assert.deepEqual(Object.getOwnPropertyDescriptors(env),before);
 delete env.Path;assert.equal(own({env,platform:'win32'}),'PaTh');
 assert.equal(own({env:Object.create({PATH:'x'}),platform:'win32'}),'Path');
});
test('no stale cache, explicit current-version defaults and non-Windows short circuit',async()=>{
 const current=(await import(fixture+'/path-key/index.js')).default;
 const env={Path:'x'};assert.equal(own({env,platform:'win32'}),'Path');env.PATH='y';assert.equal(own({env,platform:'win32'}),'PATH');
 assert.equal(own({env:new Proxy({},{ownKeys(){throw Error('not used')}}),platform:'darwin'}),'PATH');
 for(const options of [{env:null,platform:'linux'},{env:null,platform:'win32'},{env:{},platform:null},{env:{},platform:''},null]){
  let a,b;try{a=own(options)}catch(e){a=e.constructor.name}try{b=current(options)}catch(e){b=e.constructor.name}assert.equal(a,b);
 }
 for(const key of ['PATHX','XPATH','ＰＡＴＨ','páth','pa\u017fh','pAt\0'])assert.equal(own({platform:'win32',env:{[key]:'x'}}),'Path');
});
