'use strict';
function info(c,children=new c.ChannelzChildrenTracker()) {
 return {target:'fixture',state:2,callTracker:new c.ChannelzCallTracker(),trace:{getTraceMessage:()=>({events:[]})},children:children.getChildLists(),listenerChildren:children.getChildLists(),sessionChildren:children.getChildLists()};
}
function invoke(handler,request) {
 let result;handler({request},(error,value)=>{result={error,value}});return result;
}
function load(file) {
 const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),module={exports:{}};
 new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(module.exports,createRequire(file),module,file,path.dirname(file));
 return module.exports;
}
module.exports={info,invoke,load};
