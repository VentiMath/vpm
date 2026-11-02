'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const upstream=require('long'),vpm=require('../../packages/vlong');
const context={module:{exports:{}},WebAssembly:undefined};vm.runInNewContext(fs.readFileSync(require.resolve('../../packages/vlong'),'utf8'),context);
const words=[[0,0],[1,0],[-1,0],[0,1],[-1,2147483647],[0,-2147483648],[-1,-1],[1234567,-7654321]];
const methods=['add','subtract','multiply','divide','modulo','equals','compare','and','or','xor'];let checks=0;
for(const [lo,hi]of words)for(const unsigned of [false,true])for(const [blo,bhi]of words)for(const bu of [false,true])for(const method of methods){
 if((method==='divide'||method==='modulo')&&!(blo|bhi))continue;
 const normalize=x=>typeof x==='object'?[x.low,x.high,x.unsigned]:x;
 const expected=normalize(new upstream(lo,hi,unsigned)[method](new upstream(blo,bhi,bu)));
 for(const L of [vpm,context.module.exports])assert.deepEqual(normalize(new L(lo,hi,unsigned)[method](new L(blo,bhi,bu))),expected,`${method}: ${[lo,hi,unsigned,blo,bhi,bu]}`);
 checks++;
}
console.log(`${checks} mixed-signedness/boundary comparisons match long 5.3.2 with both VPM arithmetic kernels.`);
