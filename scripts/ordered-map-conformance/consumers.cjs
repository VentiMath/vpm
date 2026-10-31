'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const from=createRequire(path.resolve(__dirname,'../protobuf-conformance/package.json'));
const entry=from.resolve('@grpc/grpc-js/build/src/channelz'),local=createRequire(entry);
// Compile the unchanged caller once. Each evaluation owns its entity registries;
// the only overridden import is ordered-map. Installed sources stay untouched.
const execute=new Function('exports','require','module','__filename','__dirname',fs.readFileSync(entry,'utf8'));
function channelz(lib,stats={constructed:0}) {
  const wrapped={OrderedMap:new Proxy(lib.OrderedMap,{construct(target,args){stats.constructed++;return Reflect.construct(target,args);}})};
  const module={exports:{}};
  execute(module.exports,name=>name==='@js-sdsl/ordered-map'?wrapped:local(name),module,entry,path.dirname(entry));
  return module.exports;
}
function info(c,children=new c.ChannelzChildrenTracker()) {
  return {target:'fixture',state:2,callTracker:new c.ChannelzCallTracker(),trace:{getTraceMessage:()=>({events:[]})},children:children.getChildLists(),listenerChildren:children.getChildLists(),sessionChildren:children.getChildLists()};
}
function invoke(handler,request) {
  let result;handler({request},(error,value)=>{result={error,value};});return result;
}
module.exports={channelz,info,invoke,entry};
