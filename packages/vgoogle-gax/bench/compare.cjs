'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const original=path.resolve(__dirname,'../../../scripts/gax-conformance/node_modules/google-gax'),root=path.resolve(__dirname,'..');
const roots = new WeakMap();
const directory=lib=>roots.get(lib);
const cases=[],add=(name,make,validate,async=false)=>cases.push({name,make: selected => {const lib=require(selected);roots.set(lib,selected);return make(lib);},validate,async});
const template='projects/{project}/databases/{database}/documents/{collection}/{document}',bindings={project:'fixture',database:'default',collection:'items',document:'one'},name='projects/fixture/databases/default/documents/items/one';
add('path / construct',lib=>()=>new lib.PathTemplate(template),x=>assert.equal(x.size,7));
add('path / construct and render',lib=>()=>new lib.PathTemplate(template).render(bindings),x=>assert.equal(x,name));
add('path / repeated render',lib=>{const t=new lib.PathTemplate(template);return()=>t.render(bindings);},x=>assert.equal(x,name));
add('path / repeated match',lib=>{const t=new lib.PathTemplate(template);return()=>t.match(name);},x=>assert.deepEqual(x,bindings));
add('path / compound match',lib=>{const t=new lib.PathTemplate('items/{a}.{b}~{c}');return()=>t.match('items/one.two~three');},x=>assert.deepEqual(x,{a:'one',b:'two',c:'three'}));
add('deadline / snapshot call options',lib=>{const {addTimeoutArg}=require(path.join(directory(lib),'build/src/normalCalls/timeout'));const fn=addTimeoutArg((request,metadata,options)=>options,1000,{options:{waitForReady:true}},null);return()=>fn({},()=>{});},x=>assert.equal(x.waitForReady,true));
for(const [label,count,width,chunkSize]of [['one small message',1,64,4096],['32 messages',32,64,4096],['fragmented 64KiB message',1,65536,256]]){
 const data=Buffer.from(JSON.stringify(Array.from({length:count},()=>({text:'x'.repeat(width)})))),chunks=[];for(let i=0;i<data.length;i+=chunkSize)chunks.push(data.subarray(i,i+chunkSize));
 add('REST parser / '+label,lib=>{const Parser=require(path.join(directory(lib),'build/src/streamArrayParser')).StreamArrayParser;const proto=lib.protobuf.Root.fromJSON({nested:{M:{fields:{text:{id:1,type:'string'}}},S:{methods:{Run:{requestType:'M',responseType:'M',responseStream:true}}}}}).resolveAll(),rpc=proto.lookupService('S').methods.Run;
  return()=>new Promise((resolve,reject)=>{let sum=0;const parser=new Parser(rpc);parser.on('data',x=>{sum+=x.text.length;});parser.on('error',reject);parser.on('end',()=>resolve(sum));for(const chunk of chunks)parser.write(chunk);parser.end();});
 },x=>assert.equal(x,count*width),true);
}
for (const fallback of [false,true]) for (const refresh of [false,true]) {
 add(`proto cache / ${fallback?'REST':'gRPC'} ${refresh?'refresh':'hit'} small schema`, lib=>{
  const Client=fallback?require(path.join(directory(lib),'build/src/fallback.js')).GrpcClient:lib.GrpcClient;
  const client=new Client({auth:{}}),schema={nested:{Message:{fields:{text:{type:'string',id:1}}}}};
  Client.clearProtoCache();client.loadProtoJSON(schema);
  return()=>client.loadProtoJSON(schema,refresh);
 },result=>assert.ok(fallback?result.lookupType('Message'):result.Message));
}
for (const fallback of [false,true]) for (const refresh of [false,true]) add(`proto cache / ${fallback?'REST':'gRPC'} Firestore schema ${refresh?'refresh':'hit'}`,lib=>{
 const {firestoreSchema}=require('../../../scripts/gax-conformance/consumers.cjs');
 const Client=fallback?require(path.join(directory(lib),'build/src/fallback.js')).GrpcClient:lib.GrpcClient;
 const client=new Client({auth:{}}),schema=JSON.parse(fs.readFileSync(firestoreSchema));
 Client.clearProtoCache();client.loadProtoJSON(schema);
 return()=>client.loadProtoJSON(schema,refresh);
},result=>assert.ok(fallback?result.lookupType('google.firestore.v1.Document'):result.google.firestore.v1.Document));
const resources=[];
for(const streaming of [false,true])add(streaming?'Firestore SDK / batch read stream':'Firestore SDK / unary document',async lib=>{
 const grpc=require('../../../scripts/gax-conformance/node_modules/@grpc/grpc-js'),loader=require('../../../scripts/gax-conformance/node_modules/@grpc/proto-loader');
 const {consumer,firestoreSchema}=require('../../../scripts/gax-conformance/consumers.cjs'),{bind,collect}=require('../../../scripts/grpc-conformance/consumers.cjs');
 const documentName='projects/fixture/databases/(default)/documents/items/one',document={name:documentName,fields:{text:{stringValue:'hello é漢'},count:{integerValue:'9007199254740993'}}};
 const server=new grpc.Server({'grpc.enable_channelz':0});server.addService(loader.fromJSON(JSON.parse(fs.readFileSync(firestoreSchema)),{longs:String})['google.firestore.v1.Firestore'],{getDocument:(call,done)=>done(null,document),batchGetDocuments:call=>{call.write({found:document});call.end();}});
 const port=await bind(server,grpc.ServerCredentials.createInsecure()),{FirestoreClient}=consumer(directory(lib)).generated();
 const sdk=new FirestoreClient({servicePath:'127.0.0.1',port,sslCreds:lib.grpc.credentials.createInsecure(),projectId:'fixture',auth:{getUniverseDomain:async()=>'googleapis.com',getProjectId:async()=>'fixture'}},lib);resources.push({server,sdk});
 const call=streaming?()=>collect(sdk.batchGetDocuments({database:'projects/fixture/databases/(default)',documents:[documentName]},{timeout:5000,retry:null})):()=>sdk.getDocument({name:documentName},{timeout:5000,retry:null});await call();return call;
},x=>assert.equal((streaming?x[0].found:x[0]).fields.count.integerValue,'9007199254740993'),true);
const files=['package.json','PROVENANCE.json','index.mjs','fallback.mjs','bench/compare.cjs','../../scripts/gax-conformance/consumers.cjs','../../scripts/gax-conformance/package-lock.json','../../scripts/protobuf-conformance/package-lock.json'];
const seen=new Set();function sources(dir){if(seen.has(dir))return;seen.add(dir);for(const f of fs.readdirSync(path.join(dir,'build'),{recursive:true}).filter(f=>/\.(js|json)$/.test(f)))files.push(path.relative(root,path.join(dir,'build',f)));}
sources(root);sources(original);
// Retain hashes for every reachable VPM runtime module used by this stack.
function dependencies(dir){for(const dependency of Object.keys(require(path.join(dir,'package.json')).dependencies||{})){if(!dependency.startsWith('v'))continue;const target=path.resolve(root,'..',dependency);if(seen.has(target))continue;seen.add(target);for(const f of fs.readdirSync(target,{recursive:true}).filter(f=>!f.startsWith('test/')&&!f.startsWith('bench/')&&/\.(js|cjs|json)$/.test(f)))files.push(path.relative(root,path.join(target,f)));dependencies(target);}}
dependencies(root);
require('../../../scripts/bench-process.cjs').run({root,upstream:original,vpm:root,cases,files,validationOnly:process.argv.includes('--validate'),cleanup:async()=>{for(const{server,sdk}of resources){await sdk.close();server.forceShutdown();}}}).catch(error=>{console.error(error);process.exitCode=1;});
