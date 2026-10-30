'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {upstream,consumer,googleFrom,entry,gaxEntry,firestoreEntry,firestoreSchema}=require('./consumers.cjs');
const {schema,input}=require('../../packages/vgrpc-proto-loader/test/schema.cjs');
const grpc=googleFrom('@grpc/grpc-js');
const collect=stream=>new Promise((resolve,reject)=>{const values=[];stream.on('data',x=>values.push(x));stream.on('error',reject);stream.on('end',()=>resolve(values));});
const unary=(client,method,value)=>new Promise((resolve,reject)=>client[method](value,{deadline:Date.now()+5000},(error,result)=>error?reject(error):resolve(result)));
async function bind(server){return new Promise((resolve,reject)=>server.bindAsync('127.0.0.1:0',grpc.ServerCredentials.createInsecure(),(e,port)=>e?reject(e):resolve(port)));}
async function run(selected=require('../../packages/vgrpc-proto-loader')) {
 assert.equal(require('../protobuf-conformance/node_modules/google-gax/package.json').version,'6.14.0');assert.equal(require('../protobuf-conformance/node_modules/@google-cloud/firestore/package.json').version,'9.4.0');
 const files=[entry,gaxEntry,firestoreEntry,firestoreSchema],hashes=()=>files.map(f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex')),before=hashes();
 let rpcCalls=0;
 // Test both directions with one original endpoint and one replacement endpoint.
 for(const [serverLoader,clientLoader]of [[upstream,selected],[selected,upstream]]) {
  const opts={longs:String,enums:String,bytes:Buffer,oneofs:true},serverDef=serverLoader.fromJSON(schema,opts),clientDef=clientLoader.fromJSON(schema,opts),server=new grpc.Server();
  server.addService(serverDef['example.Catalog'],{
   getDocument(call,callback){rpcCalls++;callback(null,call.request);},
   listDocuments(call){rpcCalls++;call.write(call.request);call.write(call.request);call.end();},
   upload(call,callback){rpcCalls++;let last;call.on('data',x=>{last=x;});call.on('end',()=>callback(null,last));},
   chat(call){rpcCalls++;call.on('data',x=>call.write(x));call.on('end',()=>call.end());},
  });
  let client;
  try {
   const port=await bind(server),Client=grpc.loadPackageDefinition(clientDef).example.Catalog;client=new Client('127.0.0.1:'+port,grpc.credentials.createInsecure());
   const expected={...input,state:'READY',choice:'flag'};assert.deepEqual(await unary(client,'getDocument',input),expected);
   assert.deepEqual(await collect(client.listDocuments(input,{deadline:Date.now()+5000})),[expected,expected]);
   const uploaded=await new Promise((resolve,reject)=>{const call=client.upload({deadline:Date.now()+5000},(e,x)=>e?reject(e):resolve(x));call.write(input);call.end();});assert.deepEqual(uploaded,expected);
   const chat=client.chat({deadline:Date.now()+5000}),received=collect(chat);chat.write(input);chat.end();assert.deepEqual(await received,[expected]);
  } finally {client?.close();server.forceShutdown();}
 }
 const bound=consumer(selected),gax=bound.gax();gax.GrpcClient.clearProtoCache();
 const client=new gax.GrpcClient({auth:{}}),service=client.loadProtoJSON(schema,true).example.Catalog;
 for(const method of ['GetDocument','ListDocuments','Upload','Chat'])assert.equal(service.prototype[service.service[method].originalName],service.prototype[method]);
 const proto=path.join(__dirname,'upstream/test_protos/rpc.proto');assert.equal(typeof client.loadProto(proto,undefined,true).MyService.prototype.myMethod,'function');
 // Exercise the actual generated Firestore SDK client through gax over local gRPC.
 // Original loader supplies the server so VPM has to interoperate on the wire.
 const server=new grpc.Server(),fire=JSON.parse(fs.readFileSync(firestoreSchema,'utf8'));
 const doc={name:'projects/vpm-fixture/databases/(default)/documents/items/one',fields:{count:{integerValue:'9007199254740993'},text:{stringValue:'é漢'}}};
 let firestoreCalls=0,sdk;
 server.addService(upstream.fromJSON(fire,{longs:String,defaults:true})['google.firestore.v1.Firestore'],{
  getDocument(call,callback){firestoreCalls++;assert.equal(call.request.name,doc.name);callback(null,doc);},
  batchGetDocuments(call){firestoreCalls++;assert.deepEqual(call.request.documents,[doc.name]);call.write({found:doc});call.end();},
  write(call){firestoreCalls++;call.on('data',request=>{assert.equal(request.database,'projects/vpm-fixture/databases/(default)');call.write({streamId:'fixture-stream',streamToken:Buffer.from([1,2,3])});});call.on('end',()=>call.end());},
 });
 try {
  const port=await bind(server),{FirestoreClient}=bound.firestore();
  sdk=new FirestoreClient({servicePath:'127.0.0.1',port,sslCreds:grpc.credentials.createInsecure(),projectId:'vpm-fixture',auth:{getUniverseDomain:async()=> 'googleapis.com',getProjectId:async()=> 'vpm-fixture'}},gax);
  const [received]=await sdk.getDocument({name:doc.name},{timeout:5000,retry:null});assert.equal(received.name,doc.name);assert.equal(received.fields.count.integerValue,'9007199254740993');assert.equal(received.fields.text.stringValue,'é漢');
  const batch=await collect(sdk.batchGetDocuments({database:'projects/vpm-fixture/databases/(default)',documents:[doc.name]},{timeout:5000,retry:null}));assert.equal(batch.length,1);assert.equal(batch[0].found.name,doc.name);
  const stream=sdk.write({timeout:5000}),responses=collect(stream);stream.write({database:'projects/vpm-fixture/databases/(default)'});stream.end();const written=await responses;assert.equal(written.length,1);assert.equal(written[0].streamId,'fixture-stream');assert.deepEqual(written[0].streamToken,Buffer.from([1,2,3]));
 } finally {if(sdk)await sdk.close();server.forceShutdown();gax.GrpcClient.clearProtoCache();}
 assert.equal(rpcCalls,8);assert.equal(firestoreCalls,3);assert.ok(bound.stats.fromJSON>=2);assert.equal(bound.stats.loadSync,1);assert.deepEqual(hashes(),before);
 console.log(`${selected===upstream?'Upstream':'VPM'} loader: eight bidirectional interoperability calls across four RPC modes; real gax JSON/file loading and Firestore getDocument, batchGetDocuments and write; ${JSON.stringify(bound.stats)} loader calls. No cloud access or credentials.`);
}
module.exports=run;
if(require.main===module)run(process.argv.includes('--upstream')?upstream:undefined).catch(e=>{console.error(e);process.exitCode=1;});
