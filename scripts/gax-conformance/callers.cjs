'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const upstreamGrpc=require('@grpc/grpc-js'),loader=require('@grpc/proto-loader');
const {consumer,firestoreSchema}=require('./consumers.cjs');
const {collect,bind}=require('../grpc-conformance/consumers.cjs');
async function run(original=process.argv.includes('--upstream')){
 const directory=original?path.join(__dirname,'node_modules/google-gax'):path.resolve(__dirname,'../../packages/vgoogle-gax'),gax=require(directory),bound=consumer(directory);
 const database='projects/vpm-fixture/databases/(default)',name=database+'/documents/items/one',stamp={seconds:'1700000000',nanos:123000000};
 const doc={name,fields:{count:{integerValue:'9007199254740993'},text:{stringValue:'é漢'}},createTime:stamp,updateTime:stamp};
 const transaction=Buffer.from('fixture-transaction'),calls={};function count(name){calls[name]=(calls[name]||0)+1;}
 const server=new upstreamGrpc.Server();server.addService(loader.fromJSON(JSON.parse(fs.readFileSync(firestoreSchema)),{longs:String,defaults:true})['google.firestore.v1.Firestore'],{
  getDocument(call,done){count('get');assert.equal(call.request.name,name);done(null,doc);},
  batchGetDocuments(call){count('batchGet');assert.deepEqual(call.request.documents,[name]);if(call.request.newTransaction)call.write({transaction,readTime:stamp});call.write({found:doc,readTime:stamp});call.end();},
  beginTransaction(call,done){count('begin');done(null,{transaction});},
  commit(call,done){count('commit');assert.ok(call.request.writes.length);done(null,{writeResults:call.request.writes.map(()=>({updateTime:stamp})),commitTime:stamp});},
  rollback(call,done){count('rollback');done(null,{});},
  runQuery(call){count('query');call.write({document:doc,readTime:stamp});call.end();},
  write(call){count('write');call.on('data',()=>call.write({streamId:'fixture',streamToken:Buffer.from([1,2])}));call.on('end',()=>call.end());},
 });
 let sdk,firestore;const oldEmulator=process.env.FIRESTORE_EMULATOR_HOST;
 try{
  const port=await bind(server,upstreamGrpc.ServerCredentials.createInsecure()),{FirestoreClient}=bound.generated();
  sdk=new FirestoreClient({servicePath:'127.0.0.1',port,sslCreds:gax.grpc.credentials.createInsecure(),projectId:'vpm-fixture',auth:{getUniverseDomain:async()=>'googleapis.com',getProjectId:async()=>'vpm-fixture'}},gax);
  assert.equal((await sdk.getDocument({name},{timeout:5000,retry:null}))[0].fields.count.integerValue,'9007199254740993');
  assert.equal((await collect(sdk.batchGetDocuments({database,documents:[name]},{timeout:5000,retry:null})))[0].found.name,name);
  const stream=sdk.write({timeout:5000}),received=collect(stream);stream.write({database});stream.end();assert.deepEqual((await received)[0].streamToken,Buffer.from([1,2]));
  process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:'+port;
  const {Firestore}=bound.firestore();firestore=new Firestore({projectId:'vpm-fixture',useBigInt:true});const ref=firestore.doc('items/one');
  assert.equal((await firestore.getAll(ref))[0].get('count'),9007199254740993n);
  await firestore.batch().set(ref,{text:'updated'}).commit();
  const result=await firestore.runTransaction(async tx=>{const snapshot=await tx.get(ref);tx.update(ref,{text:'transaction'});return snapshot.get('text');});assert.equal(result,'é漢');
  const documents=await collect(firestore.collection('items').stream());assert.equal(documents[0].get('text'),'é漢');
  assert.ok(bound.stats.gaxImports>0);assert.equal(calls.commit,2);assert.equal(calls.query,1);assert.ok(calls.batchGet>=3);
 }finally{if(oldEmulator===undefined)delete process.env.FIRESTORE_EMULATOR_HOST;else process.env.FIRESTORE_EMULATOR_HOST=oldEmulator;await sdk?.close();await firestore?.terminate();server.forceShutdown();gax.GrpcClient.clearProtoCache();}
 // Exercise the real auth.fetch -> gaxios/native-fetch path with a local server.
 const fallback=require(path.join(directory,'build/src/fallback')),authLib=original?require('google-auth-library'):require('../../packages/vgoogle-auth-library');
 const auth=new authLib.GoogleAuth({authClient:new authLib.PassThroughClient(),projectId:'vpm-fixture'}),hits=[];
 const httpServer=http.createServer(async(req,res)=>{
  hits.push(req.url);let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body||'{}');res.setHeader('content-type','application/json');
  if(input.content==='error'){res.statusCode=503;res.end(JSON.stringify({error:{code:503,message:'fixture unavailable',status:'UNAVAILABLE'}}));}
  else if(req.url.includes(':expand')){res.write('[{"content":"first"}');setImmediate(()=>res.end(input.content==='truncated'?'':',{"content":"last"}]'));}
  else res.end(JSON.stringify({content:'native-fetch'}));
 });
 const native=globalThis.fetch;let fetchCalls=0;globalThis.fetch=function(...args){fetchCalls++;return Reflect.apply(native,this,args);};
 try{
  await new Promise(resolve=>httpServer.listen(0,'127.0.0.1',resolve));const port=httpServer.address().port;
  const client=new fallback.GrpcClient({auth}),root=client.loadProtoJSON(require('./upstream/test/fixtures/echo.json'));
  const stub=await client.createStub(root.lookupService('Echo'),{servicePath:'127.0.0.1',port,protocol:'http'});
  const result=await new Promise((resolve,reject)=>stub.echo({content:'hello'},{},{deadline:new Date(Date.now()+5000)},(error,value)=>error?reject(error):resolve(value)));
  assert.equal(result.content,'native-fetch');
  const values=await collect(stub.expand({content:'stream'},{},{deadline:new Date(Date.now()+5000)}));assert.deepEqual(values.map(x=>x.content),['first','last']);
  await assert.rejects(new Promise((resolve,reject)=>stub.echo({content:'error'},{},{deadline:new Date(Date.now()+5000)},(error,value)=>error?reject(error):resolve(value))),error=>error.code===gax.Status.UNAVAILABLE&&error.httpStatusCode===503);
  if(!original){const truncated=stub.expand({content:'truncated'},{},{deadline:new Date(Date.now()+5000)});let errors=0;truncated.on('error',()=>errors++);await assert.rejects(collect(truncated),/Truncated JSON array/);await new Promise(resolve=>setImmediate(resolve));assert.equal(errors,1);assert.equal(fetchCalls,4,'ordinary REST calls must use native fetch');}
  assert.equal(hits.length,original?3:4);stub.close();
 }finally{globalThis.fetch=native;httpServer.closeAllConnections();await new Promise(resolve=>httpServer.close(resolve));}
 await require('./tracing.cjs')(original);
 console.log(`${original?'Upstream':'VPM'} gax: Firestore 9.4.0 generated RPCs, getAll, batch commit, read/write transaction, streamed query, real REST auth transport and SDK 3.0.0 tracing passed. Native fetch calls: ${fetchCalls}.`);
}
module.exports=run;if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
