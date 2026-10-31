'use strict';
const assert=require('node:assert/strict'),{channelz,info,invoke}=require('./consumers.cjs');
function run(lib=require('../../packages/vordered-map')) {
  const stats={constructed:0},c=channelz(lib,stats),handlers=c.getChannelzHandlers(),children=new c.ChannelzChildrenTracker();
  for(const kind of ['channel','subchannel','socket']) {
    const refs=Array.from({length:30},(_,i)=>({kind,id:i*2+1,name:`${kind}-${i}`}));
    for(const ref of refs.toReversed()){children.refChild(ref);children.refChild(ref);}
    const map=children.getChildLists()[kind==='channel'?'channels':kind==='socket'?'sockets':'subchannels'];
    assert.deepEqual([...map].map(([id,entry])=>[id,entry.count]),refs.map(r=>[r.id,2]));
    for(const ref of refs)children.unrefChild(ref);
    assert.equal(map.size(),30);for(const ref of refs)assert.equal(map.getElementByKey(ref.id).count,1);
    for(const ref of refs.slice(0,10)){children.unrefChild(ref);children.unrefChild(ref);}
    assert.equal(map.size(),20);
  }
  const details=info(c,children),refs={};
  for(const [kind,method]of [['channel','Channel'],['subchannel','Subchannel'],['server','Server'],['socket','Socket']]) {
    refs[kind]=Array.from({length:40},(_,i)=>c['registerChannelz'+method](kind+i,()=>details,true));
    c.unregisterChannelzRef(refs[kind][4]);
    const first=invoke(handlers['Get'+method],{[kind+'_id']:String(refs[kind][0].id)});
    assert.equal(first.error,null);assert.equal(first.value[kind].ref[kind+'_id'],refs[kind][0].id);
    const missing=invoke(handlers['Get'+method],{[kind+'_id']:String(refs[kind][4].id)});
    assert.equal(missing.error.code,5);
  }
  for(const [kind,method,list]of [['channel','GetTopChannels','channel'],['server','GetServers','server']]) {
    const collected=[];let start=0,end=false;
    while(!end) {
      const result=invoke(handlers[method],{['start_'+kind+'_id']:String(start),max_results:'7'});
      assert.equal(result.error,null);const rows=result.value[list];assert.ok(rows.length<=7);
      collected.push(...rows.map(row=>row.ref[kind+'_id']));end=result.value.end;
      if(rows.length)start=rows.at(-1).ref[kind+'_id']+1;else assert.equal(end,true);
    }
    assert.deepEqual(collected,refs[kind].filter((_,i)=>i!==4).map(r=>r.id));
    const beyond=invoke(handlers[method],{['start_'+kind+'_id']:'9999',max_results:'10'}).value;
    assert.equal(beyond.end,true);assert.deepEqual(beyond[list],[]);
  }
  const sockets=invoke(handlers.GetServerSockets,{server_id:String(refs.server[0].id),start_socket_id:'30',max_results:'3'}).value;
  assert.deepEqual(sockets.socket_ref.map(r=>r.socket_id),[31,33,35]);assert.equal(sockets.end,false);
  const channel=invoke(handlers.GetChannel,{channel_id:String(refs.channel[0].id)}).value.channel;
  assert.equal(channel.channel_ref.length,20);assert.equal(channel.subchannel_ref.length,20);
  const disabled=c.registerChannelzChannel('disabled',()=>details,false);
  assert.equal(invoke(handlers.GetChannel,{channel_id:String(disabled.id)}).error.code,5);
  for(const group of Object.values(refs))for(const ref of group)c.unregisterChannelzRef(ref);
  assert.deepEqual(invoke(handlers.GetTopChannels,{start_channel_id:'0',max_results:'100'}).value,{channel:[],end:true});
  assert.equal(stats.constructed,7);
  console.log('gRPC 1.14.7 Channelz: all seven handlers, reference counts, sorted pages, gaps, disabled registration and cleanup passed.');
}
module.exports=run;
if(require.main===module)run(process.argv.includes('--upstream')?require('@js-sdsl/ordered-map'):undefined);
