'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{PassThrough}=require('node:stream');
const upstream=require('../../../scripts/consumers/node_modules/is-stream'),vpm=require('..'),stream=new PassThrough();
const cases=['call','readable','writable','duplex','transform'].map(method=>({name:method+' stream',make:lib=>()=>method==='call'?lib(stream):lib[method](stream),validate:v=>assert.equal(v,true)}));
cases.push({name:'reject plain object',make:lib=>{const v={value:1};return()=>lib(v);},validate:v=>assert.equal(v,false)});
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/consumers/node_modules/is-stream/index.js','../../scripts/consumers/package-lock.json'],cleanup:async()=>stream.destroy()}).catch(e=>{console.error(e);process.exitCode=1;});
