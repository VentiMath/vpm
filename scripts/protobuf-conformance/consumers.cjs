'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire,isBuiltin}=require('node:module');
const from=createRequire(path.join(__dirname,'package.json'));
const roots={upstream:path.dirname(from.resolve('protobufjs')),legacy:path.dirname(createRequire(from.resolve('google-gax')).resolve('protobufjs')),vpm:path.resolve(__dirname,'../../packages/vprotobufjs')};
function consumer(variant='vpm',stats={}){
 const root=roots[variant],cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
  const local=createRequire(file),mod={exports:{}};cache.set(file,mod);
  function req(name){
   if(name==='protobufjs'||name.startsWith('protobufjs/')){stats[name]=(stats[name]||0)+1;return require(name==='protobufjs'?root:path.join(root,name.slice(11)));}
   if(isBuiltin(name))return local(name);
   const resolved=local.resolve(name);
   return /\/node_modules\/(?:google-gax|@grpc\/proto-loader|proto3-json-serializer|@google-cloud\/firestore(?:-api)?)\//.test(resolved)?load(resolved):local(name);
  }
  req.resolve=local.resolve;req.cache=require.cache;
  new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(mod.exports,req,mod,file,path.dirname(file));return mod.exports;
 }
 return {load,from,stats,pb:require(root),protoLoader:()=>load(from.resolve('@grpc/proto-loader')),gax:file=>load(path.join(path.dirname(from.resolve('google-gax')),file)),firestore:()=>load(from.resolve('@google-cloud/firestore'))};
}
const schema={nested:{fixture:{nested:{Item:{fields:{id:{type:'int64',id:1},text:{type:'string',id:2},bytes:{type:'bytes',id:3},values:{type:'sint32',rule:'repeated',id:4},labels:{keyType:'string',type:'string',id:5},stamp:{type:'Timestamp',id:6}}},Timestamp:{fields:{seconds:{type:'int64',id:1},nanos:{type:'int32',id:2}}},Catalog:{methods:{Get:{requestType:'Item',responseType:'Item'}}}}}}};
const input={id:'9007199254740993',text:'é漢😀',bytes:Buffer.from([0,255,128]),values:[-1,0,1,2000],labels:{key:'value'},stamp:{seconds:'1793397600',nanos:123456789}};
module.exports={consumer,from,roots,schema,input};
