'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire,isBuiltin}=require('node:module');
const from=createRequire(path.resolve(__dirname,'../protobuf-conformance/package.json'));
const firestoreEntry=from.resolve('@google-cloud/firestore');
const firestoreSchema=path.join(path.dirname(firestoreEntry),'../protos/v1.json');
function consumer(directory=path.resolve(__dirname,'../../packages/vgoogle-gax')) {
 const cache=new Map(),stats={gaxImports:0};
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
  const local=createRequire(file),module={exports:{}};cache.set(file,module);
  function req(name){
   if(name==='google-gax'||name.startsWith('google-gax/')){stats.gaxImports++;const sub=name.slice(11);return require(path.join(directory,name==='google-gax'?'build/src/index.js':sub.startsWith('build/')?sub:'build/src/'+sub));}
   if(isBuiltin(name))return local(name);const resolved=local.resolve(name);
   return /\/node_modules\/@google-cloud\/firestore(?:-api)?\//.test(resolved)?load(resolved):local(name);
  }
  req.resolve=local.resolve;req.cache=require.cache;
  new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(module.exports,req,module,file,path.dirname(file));return module.exports;
 }
 return {stats,firestore:()=>load(firestoreEntry),generated:()=>load(from.resolve('@google-cloud/firestore-api/build/src/v1/firestore_client'))};
}
module.exports={consumer,firestoreSchema};
