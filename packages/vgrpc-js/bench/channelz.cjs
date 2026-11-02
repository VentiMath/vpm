'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const {info,invoke,load}=require('../../../scripts/grpc-conformance/channelz-fixture.cjs');
const cases=[];
for(const size of [100,10000]){
 cases.push({name:`page 100 of ${size} channels`,make:file=>{
  const c=load(file),data=info(c),handler=c.getChannelzHandlers().GetTopChannels;
  // Each case evaluates its selected module with fresh entity registries.
  const refs=Array.from({length:size},(_,i)=>c.registerChannelzChannel('channel'+i,()=>data,true));
  const start=refs[Math.floor((size-100)/2)].id,request={start_channel_id:String(start),max_results:'100'};
  return ()=>invoke(handler,request).value.channel.length;
 },validate:x=>assert.equal(x,100)});
}
cases.push({name:'register and unregister channel',make:file=>{const c=load(file),data=info(c);return()=>{const ref=c.registerChannelzChannel('transient',()=>data,true);c.unregisterChannelzRef(ref);return ref.kind}},validate:x=>assert.equal(x,'channel')});
cases.push({name:'child reference and release',make:file=>{const c=load(file),tracker=new c.ChannelzChildrenTracker(),child={id:17,kind:'socket',name:'socket'};return()=>{tracker.refChild(child);tracker.refChild(child);tracker.unrefChild(child);tracker.unrefChild(child);return tracker.getChildLists().sockets.size()}},validate:x=>assert.equal(x,0)});
cases.push({name:'remove and restore middle of 10000 children',make:file=>{
 const c=load(file),tracker=new c.ChannelzChildrenTracker();let middle;
 for(let id=1;id<=10000;id++){const ref={id,kind:'socket',name:'socket'};tracker.refChild(ref);if(id===5000)middle=ref}
 return()=>{tracker.unrefChild(middle);tracker.refChild(middle);return tracker.getChildLists().sockets.size()};
},validate:x=>assert.equal(x,10000)});
cases.push({name:'first page after churn among 10000 channels',make:file=>{
 const c=load(file),data=info(c),handler=c.getChannelzHandlers().GetTopChannels;
 const refs=Array.from({length:10000},(_,i)=>c.registerChannelzChannel('channel'+i,()=>data,true));
 const request={start_channel_id:String(refs[5000].id),max_results:'100'};
 return()=>{const temporary=c.registerChannelzChannel('temporary',()=>data,true);c.unregisterChannelzRef(temporary);return invoke(handler,request).value.channel.length};
},validate:x=>assert.equal(x,100)});
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(root,'../../scripts/grpc-conformance/node_modules/@grpc/grpc-js/build/src/channelz.js'),vpm:path.join(root,'build/src/channelz.js'),cases,files:['package.json','build/src/channelz.js','build/src/channelz-registry.js','bench/channelz.cjs','../../scripts/grpc-conformance/channelz-fixture.cjs','../../scripts/grpc-conformance/package-lock.json','../../scripts/grpc-conformance/node_modules/@grpc/grpc-js/build/src/channelz.js','../../scripts/grpc-conformance/node_modules/@js-sdsl/ordered-map']}).catch(error=>{console.error(error);process.exitCode=1});
