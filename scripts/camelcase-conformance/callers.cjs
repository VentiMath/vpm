'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{createHash}=require('node:crypto'),fs=require('node:fs');
const upstream=require('./node_modules/lodash.camelcase');
const {load,schema,names,entry,gaxEntry,firestoreSchema}=require('./loader.cjs');
function run(target=require('../../packages/vlodash.camelcase'),useVpmProtobuf=false){
 assert.equal(require('./node_modules/@grpc/proto-loader/package.json').version,'0.8.1');
 assert.equal(require('../protobuf-conformance/node_modules/google-gax/package.json').version,'6.14.0');
 assert.equal(require('../protobuf-conformance/node_modules/@google-cloud/firestore/package.json').version,'9.4.0');
 const files=[entry,gaxEntry,firestoreSchema],hashes=()=>files.map(f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex')),before=hashes();
 const stats={names:[]},selected=load(target,stats,useVpmProtobuf?path.resolve(__dirname,'../../packages/vprotobufjs'):undefined),control=load(upstream);
 const expectedNames=names.map(upstream),input={name:'student',count:42};
 for(const method of ['fromJSON','loadSync','load'])assert.equal(typeof selected.loader[method],'function');
 const actual=selected.loader.fromJSON(structuredClone(schema)),original=control.loader.fromJSON(structuredClone(schema));
 for(const [i,name]of names.entries()){
  const a=actual['fixture.Catalog'][name],b=original['fixture.Catalog'][name];
  assert.equal(a.originalName,expectedNames[i]);assert.equal(a.path,'/fixture.Catalog/'+name);
  assert.deepEqual(Buffer.from(a.requestSerialize(input)),Buffer.from(b.requestSerialize(input)));
  assert.deepEqual(a.responseDeserialize(b.responseSerialize(input)),input);
  assert.equal(a.requestStream,i===1);assert.equal(a.responseStream,i===2);
 }
 assert.deepEqual(stats.names,names);
 const {GrpcClient}=selected.gax(),client=new GrpcClient({auth:{}});
 const stub=client.loadProtoJSON(structuredClone(schema),true).fixture.Catalog;
 for(const [i,name]of names.entries()){
  assert.equal(stub.service[name].originalName,expectedNames[i]);
  assert.equal(typeof stub.prototype[expectedNames[i]],'function');
  assert.equal(stub.prototype[expectedNames[i]],stub.prototype[name]);
 }
 // A complete shipped Firestore schema exercises the real Google API method
 // names, rather than reconstructing the caller's aliasing logic in the test.
 const fire=JSON.parse(fs.readFileSync(firestoreSchema,'utf8'));
 const defs=selected.loader.fromJSON(fire),baseline=control.loader.fromJSON(fire);
 let methods=0;
 for(const [service,definition]of Object.entries(defs))for(const [name,method]of Object.entries(definition))if(method&&typeof method==='object'&&typeof method.path==='string'){
  assert.equal(method.originalName,baseline[service][name].originalName);
  assert.equal(method.path,baseline[service][name].path);methods++;
 }
 assert.equal(methods,17);assert.equal(stats.names.length,names.length*2+methods);
 assert.deepEqual(hashes(),before,'installed consumer sources remain unchanged');
 console.log(`${target===upstream?'upstream':'VPM'} camelCase${useVpmProtobuf?' + VPM protobuf':''}: ${names.length} loader aliases/wire round-trips, ${names.length} actual gax/grpc-js client aliases, ${methods} shipped Firestore methods; ${stats.names.length} observed calls.`);
}
module.exports=run;
if(require.main===module)run(process.argv.includes('--upstream')?upstream:undefined,process.argv.includes('--stack'));
