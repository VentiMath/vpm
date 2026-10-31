'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const upstream=require('@grpc/grpc-js'),loader=require('@grpc/proto-loader');
const {schema,input}=require('../../packages/vgrpc-proto-loader/test/schema.cjs');
const {consumer,firestoreSchema,collect,unary,bind}=require('./consumers.cjs');
async function run(selected=require('../../packages/vgrpc-js')) {
  let calls=0;
  const definition=loader.fromJSON(schema,{longs:String,enums:String,bytes:Buffer,oneofs:true});
  for(const [serverGrpc,clientGrpc]of [[upstream,selected],[selected,upstream]]) {
    const server=new serverGrpc.Server(),Client=clientGrpc.loadPackageDefinition(definition).example.Catalog;
    server.addService(definition['example.Catalog'],{
      getDocument(call,callback){calls++;assert.equal(call.metadata.get('x-fixture')[0],'transport');const trailing=new serverGrpc.Metadata();trailing.set('x-trailer','done');callback(null,call.request,trailing);},
      listDocuments(call){calls++;for(let i=0;i<3;i++)call.write(call.request);call.end();},
      upload(call,callback){calls++;let last;call.on('data',value=>{last=value;});call.on('end',()=>callback(null,last));},
      chat(call){calls++;call.on('data',value=>call.write(value));call.on('end',()=>call.end());}
    });
    const port=await bind(server,serverGrpc.ServerCredentials.createInsecure()),client=new Client('127.0.0.1:'+port,clientGrpc.credentials.createInsecure()),metadata=new clientGrpc.Metadata();metadata.set('x-fixture','transport');
    try {
      const result=await unary(client,'getDocument',input,metadata);assert.equal(result.id,input.id);
      const list=await collect(client.listDocuments(input,{deadline:Date.now()+5000}));assert.equal(list.length,3);assert.equal(list[0].id,input.id);
      const upload=await new Promise((resolve,reject)=>{const call=client.upload({deadline:Date.now()+5000},(e,v)=>e?reject(e):resolve(v));call.write(input);call.end();});assert.equal(upload.id,input.id);
      const stream=client.chat({deadline:Date.now()+5000}),resultStream=collect(stream);stream.write(input);stream.write(input);stream.end();assert.equal((await resultStream).length,2);
    }finally{client.close();server.forceShutdown();}
  }
  // Use actual gax/Firestore methods with the selected transport, not a rewritten SDK.
  const bound=consumer(selected),gax=bound.gax();gax.GrpcClient.clearProtoCache();
  const server=new upstream.Server(),fire=JSON.parse(fs.readFileSync(firestoreSchema,'utf8'));
  const name='projects/vpm-fixture/databases/(default)/documents/items/one',doc={name,fields:{count:{integerValue:'9007199254740993'},text:{stringValue:'é漢'}}};
  server.addService(loader.fromJSON(fire,{longs:String,defaults:true})['google.firestore.v1.Firestore'],{
    getDocument(call,callback){calls++;assert.equal(call.request.name,name);callback(null,doc);},
    batchGetDocuments(call){calls++;call.write({found:doc});call.end();},
    write(call){calls++;call.on('data',()=>call.write({streamId:'fixture',streamToken:Buffer.from([1,2])}));call.on('end',()=>call.end());}
  });
  let sdk;
  try {
    const port=await bind(server,upstream.ServerCredentials.createInsecure()),{FirestoreClient}=bound.firestore();
    sdk=new FirestoreClient({servicePath:'127.0.0.1',port,sslCreds:selected.credentials.createInsecure(),projectId:'vpm-fixture',auth:{getUniverseDomain:async()=>'googleapis.com',getProjectId:async()=>'vpm-fixture'}},gax);
    const [result]=await sdk.getDocument({name},{timeout:5000,retry:null});assert.equal(result.fields.count.integerValue,'9007199254740993');
    const batch=await collect(sdk.batchGetDocuments({database:'projects/vpm-fixture/databases/(default)',documents:[name]},{timeout:5000,retry:null}));assert.equal(batch[0].found.name,name);
    const stream=sdk.write({timeout:5000}),received=collect(stream);stream.write({database:'projects/vpm-fixture/databases/(default)'});stream.end();assert.deepEqual((await received)[0].streamToken,Buffer.from([1,2]));
  }finally{if(sdk)await sdk.close();server.forceShutdown();gax.GrpcClient.clearProtoCache();}
  assert.ok(bound.stats.loadPackageDefinition>0);assert.equal(calls,11);
  // TLS and metadata credentials are exercised without network credentials.
  const ca=fs.readFileSync(path.join(__dirname,'tls/ca.pem')),key=fs.readFileSync(path.join(__dirname,'tls/server1.key')),cert=fs.readFileSync(path.join(__dirname,'tls/server1.pem'));
  const tlsServer=new upstream.Server();tlsServer.addService(definition['example.Catalog'],{getDocument(call,done){assert.equal(call.metadata.get('x-auth')[0],'fixture');done(null,call.request);}});
  let tlsClient;
  try {
    const port=await bind(tlsServer,upstream.ServerCredentials.createSsl(null,[{private_key:key,cert_chain:cert}]));
    const credentials=selected.credentials.combineChannelCredentials(selected.credentials.createSsl(ca),selected.credentials.createFromMetadataGenerator((options,callback)=>{const metadata=new selected.Metadata();metadata.set('x-auth','fixture');callback(null,metadata);}));
    const Client=selected.loadPackageDefinition(definition).example.Catalog;tlsClient=new Client('127.0.0.1:'+port,credentials,{'grpc.ssl_target_name_override':'foo.test.google.fr','grpc.default_authority':'foo.test.google.fr'});
    assert.equal((await unary(tlsClient,'getDocument',input,new selected.Metadata())).id,input.id);
  }finally{tlsClient?.close();tlsServer.forceShutdown();}
  console.log(`${selected===upstream?'Upstream':'VPM'} transport: four RPC modes in both directions, Firestore unary/server-stream/bidi calls and verified TLS with call credentials (12 local calls).`);
}
module.exports=run;
if(require.main===module)run(process.argv.includes('--upstream')?upstream:undefined).catch(error=>{console.error(error);process.exitCode=1;});
