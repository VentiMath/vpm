'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const upstream=require('../../../scripts/consumers/node_modules/extend'),vpm=require('..');
const cases=[];const add=(name,args)=>cases.push({name,make:lib=>()=>lib(...args()),validate:v=>assert.deepEqual(v,upstream(...args()))});
add('shallow three fields',()=>[{}, {a:1,b:2,c:3}]);
add('deep HTTP options',()=>[true,{}, {headers:{Accept:'application/json'},timeout:1000,params:{limit:50}}, {headers:{Authorization:'Bearer test'},params:{page:2}}]);
const large=Object.fromEntries(Array.from({length:50},(_,i)=>['k'+i,{value:i,list:[i,i+1]}]));add('deep 50 records',()=>[true,{},large]);
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/consumers/node_modules/extend/index.js','../../scripts/consumers/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1;});
