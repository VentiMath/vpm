'use strict';
const assert=require('node:assert/strict'),upstream=require('@google-cloud/paginator'),vpm=require('../../packages/vpaginator');
(async()=>{
 for(const [lib,isVpm]of [[upstream,false],[vpm,true]]){
  const page=[1,2,3],s=new lib.ResourceStream({query:{},maxResults:1,maxApiCalls:-1},(_q,cb)=>cb(null,page,null));for await(const value of s)assert.equal(value,1);assert.deepEqual(page,isVpm?[1,2,3]:[2,3]);
  const bounded=new lib.ResourceStream({query:{},maxResults:-1,maxApiCalls:-1,streamOptions:{highWaterMark:1}},(_q,cb)=>cb(null,[1,2,3,4],null));bounded.read(0);assert.equal(bounded.readableLength,isVpm?1:4);bounded.destroy();
  let cancel=0,callback;const pending=new lib.ResourceStream({query:{},maxResults:-1,maxApiCalls:-1},(_q,cb)=>{callback=cb;return{abort(){cancel++;}};});pending.read(0);pending.destroy();assert.equal(cancel,isVpm?1:0);if(isVpm)callback(null,[1],{});
  if(isVpm)assert.throws(()=>lib.paginator.parseArguments_([{maxResults:NaN}]),RangeError);else assert.equal(lib.paginator.parseArguments_([{maxResults:NaN}]).maxResults,-1);
 }
 console.log('Verified upstream mutation, excess readable buffering, uncancelled request and invalid-limit behavior; vpaginator regressions fixed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
