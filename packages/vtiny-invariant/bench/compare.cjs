'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),root=path.resolve(__dirname,'..');
function invariant(directory,mode){const context={module:{exports:{}},process:{env:{NODE_ENV:mode}},Error};vm.runInNewContext(fs.readFileSync(require.resolve(directory),'utf8'),context);return context.module.exports}
const cases=[];
for(const mode of ['development','production']){
 cases.push({name:mode+' success',make:directory=>{const check=invariant(directory,mode);let value=1;return()=>{value=(value+1)&255;check(value+1);return value>=0}},validate:x=>assert.equal(x,true)});
 cases.push({name:mode+' failure with lazy message',make:directory=>{const check=invariant(directory,mode);return()=>{try{check(false,()=> 'detail')}catch(error){return error.message}}},validate:x=>assert.equal(x,mode==='production'?'Invariant failed':'Invariant failed: detail')});
}
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(root,'../../scripts/invariant-conformance/node_modules/tiny-invariant'),vpm:root,cases,files:['package.json','index.cjs','bench/compare.cjs','../../scripts/invariant-conformance/package-lock.json','../../scripts/invariant-conformance/node_modules/tiny-invariant']}).catch(error=>{console.error(error);process.exitCode=1});
