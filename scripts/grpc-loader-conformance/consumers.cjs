'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire,isBuiltin}=require('node:module');
const from=createRequire(path.join(__dirname,'package.json'));
const googleFrom=createRequire(path.resolve(__dirname,'../protobuf-conformance/package.json'));
const upstream=from('@grpc/proto-loader'),entry=from.resolve('@grpc/proto-loader');
const firestoreSchema=path.join(path.dirname(googleFrom.resolve('@google-cloud/firestore')),'../protos/v1.json');
const gaxEntry=googleFrom.resolve('google-gax');
const firestoreEntry=googleFrom.resolve('@google-cloud/firestore-api/build/src/v1/firestore_client');
function moduleLoader(overrides,include) {
 const cache=new Map();
 function load(file) {
  if(cache.has(file))return cache.get(file).exports;
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
  const local=createRequire(file),mod={exports:{}};cache.set(file,mod);
  function req(name) {
   const replacement=overrides(name);if(replacement!==undefined)return replacement;
   if(isBuiltin(name))return local(name);
   const resolved=local.resolve(name);return include(resolved)?load(resolved):local(name);
  }
  req.resolve=local.resolve;req.cache=require.cache;
  new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(mod.exports,req,mod,file,path.dirname(file));
  return mod.exports;
 }
 return load;
}
function upstreamOnPB8() {
 const pb=path.resolve(__dirname,'../protobuf-conformance/node_modules/protobufjs');
 return moduleLoader(name=>name==='protobufjs'?require(pb):name.startsWith('protobufjs/')?require(path.join(pb,name.slice(11))):undefined,file=>file.startsWith(path.dirname(entry)+path.sep))(entry);
}
function consumer(loader,stats={}) {
 const wrapped={...loader};
 for(const name of ['fromJSON','load','loadSync','loadFileDescriptorSetFromBuffer','loadFileDescriptorSetFromObject'])wrapped[name]=(...args)=>{stats[name]=(stats[name]||0)+1;return loader[name](...args);};
 const load=moduleLoader(name=>name==='@grpc/proto-loader'?wrapped:undefined,file=>/\/node_modules\/(?:google-gax|@google-cloud\/firestore-api)\//.test(file));
 return {stats,gax:()=>load(gaxEntry),firestore:()=>load(firestoreEntry)};
}
function plain(value) {
 if(typeof value==='function')return '<function>';
 if(value instanceof Uint8Array)return [...value];
 if(Array.isArray(value))return value.map(plain);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,plain(v)]));
 return value;
}
module.exports={from,googleFrom,upstream,upstreamOnPB8,entry,gaxEntry,firestoreEntry,firestoreSchema,consumer,plain};
