'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire,isBuiltin}=require('node:module');
const from=createRequire(path.join(__dirname,'package.json'));
const entry=from.resolve('@grpc/proto-loader'),loaderRoot=path.dirname(entry);
const googleFrom=createRequire(path.resolve(__dirname,'../protobuf-conformance/package.json'));
const gaxEntry=path.join(path.dirname(googleFrom.resolve('google-gax')),'grpc.js');
const firestoreSchema=path.join(path.dirname(googleFrom.resolve('@google-cloud/firestore')),'../protos/v1.json');
function load(camelCase,stats,protobuf){
 const cache=new Map();
 function read(file){
  if(cache.has(file))return cache.get(file).exports;
  const local=createRequire(file),mod={exports:{}};cache.set(file,mod);
  function req(name){
   if(name==='lodash.camelcase')return stats?value=>{stats.names.push(value);return camelCase(value);}:camelCase;
   if(name==='@grpc/proto-loader')return read(entry);
   if(protobuf&&(name==='protobufjs'||name.startsWith('protobufjs/')))return require(name==='protobufjs'?protobuf:path.join(protobuf,name.slice(11)));
   if(isBuiltin(name))return local(name);
   const resolved=local.resolve(name);
   return resolved.startsWith(loaderRoot+path.sep)?read(resolved):local(name);
  }
  req.resolve=local.resolve;req.cache=require.cache;
  new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(mod.exports,req,mod,file,path.dirname(file));
  return mod.exports;
 }
 return {loader:read(entry),gax:()=>read(gaxEntry)};
}
const names=['GetDocument','BatchGetDocuments','RunQuery','GetIamPolicy','SetIamPolicy','TestIamPermissions','XMLHttpRequest','getURLValue','HTTP2Request','foo_bar','get_v2_URL','ABC','A'];
const schema={nested:{fixture:{nested:{Message:{fields:{name:{type:'string',id:1},count:{type:'int32',id:2}}},Catalog:{methods:Object.fromEntries(names.map((name,i)=>[name,{requestType:'Message',responseType:'Message',requestStream:i===1,responseStream:i===2}]))}}}}};
module.exports={load,schema,names,entry,gaxEntry,firestoreSchema};
