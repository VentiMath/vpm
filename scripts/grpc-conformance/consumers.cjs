'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire,isBuiltin}=require('node:module');
const from=createRequire(path.resolve(__dirname,'../protobuf-conformance/package.json'));
const gaxEntry=from.resolve('google-gax'),firestoreEntry=from.resolve('@google-cloud/firestore-api/build/src/v1/firestore_client');
const firestoreSchema=path.join(path.dirname(from.resolve('@google-cloud/firestore')),'../protos/v1.json');
function consumer(grpc,stats={}) {
  const cache=new Map(),wrapped=new Proxy(grpc,{get(target,key,receiver){stats[key]=(stats[key]||0)+1;return Reflect.get(target,key,receiver);}});
  function load(file) {
    if(cache.has(file))return cache.get(file).exports;
    if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
    const local=createRequire(file),module={exports:{}};cache.set(file,module);
    function req(name){if(name==='@grpc/grpc-js')return wrapped;if(isBuiltin(name))return local(name);const resolved=local.resolve(name);return /\/node_modules\/(?:google-gax|@google-cloud\/firestore-api)\//.test(resolved)?load(resolved):local(name);}
    req.resolve=local.resolve;req.cache=require.cache;
    new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(module.exports,req,module,file,path.dirname(file));
    return module.exports;
  }
  return {stats,gax:()=>load(gaxEntry),firestore:()=>load(firestoreEntry)};
}
const collect=stream=>new Promise((resolve,reject)=>{const values=[];stream.on('data',v=>values.push(v));stream.on('error',reject);stream.on('end',()=>resolve(values));});
const unary=(client,method,request,metadata,options={})=>new Promise((resolve,reject)=>client[method](request,metadata,{deadline:Date.now()+5000,...options},(e,v)=>e?reject(e):resolve(v)));
const bind=(server,credentials,address='127.0.0.1:0')=>new Promise((resolve,reject)=>server.bindAsync(address,credentials,(e,port)=>e?reject(e):resolve(port)));
module.exports={consumer,from,gaxEntry,firestoreEntry,firestoreSchema,collect,unary,bind};
