'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire,isBuiltin}=require('node:module');
const from=createRequire(path.join(__dirname,'package.json'));
function consumer(variant='vpm',legacy=false,stats={}) {
 const pbRoot=legacy||variant==='upstream'?path.dirname(from.resolve('protobufjs')):path.resolve(__dirname,'../../packages/vprotobufjs');
 const serializer=variant==='upstream'?from('proto3-json-serializer'):require('../../packages/vproto3-json-serializer');
 const traced=Object.fromEntries(['toProto3JSON','fromProto3JSON'].map(key=>[key,(...args)=>{stats[key]=(stats[key]||0)+1;return serializer[key](...args);} ]));
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
  const local=createRequire(file),mod={exports:{}};cache.set(file,mod);
  function req(name){
   if(name==='proto3-json-serializer')return traced;
   if(name==='protobufjs'||name.startsWith('protobufjs/'))return require(name==='protobufjs'?pbRoot:path.join(pbRoot,name.slice(11)));
   if(isBuiltin(name))return local(name);
   const resolved=local.resolve(name);
   return /\/node_modules\/(?:google-gax|@grpc\/proto-loader|@google-cloud\/firestore(?:-api)?)\//.test(resolved)?load(resolved):local(name);
  }
  req.resolve=local.resolve;req.cache=require.cache;
  new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(mod.exports,req,mod,file,path.dirname(file));return mod.exports;
 }
 const pb=require(pbRoot);
 return {pb,stats,serializer,load,gax:file=>load(path.join(path.dirname(from.resolve('google-gax')),file)),firestoreSchema:()=>from('@google-cloud/firestore-api/build/protos/protos.json')};
}
module.exports={consumer,from};
