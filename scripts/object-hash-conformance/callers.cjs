'use strict';
const assert=require('node:assert/strict'),{load,schema}=require('./gax.cjs');
function run(upstream=false){
 assert.equal(require('./node_modules/google-gax/package.json').version,'6.14.0');
 const base=upstream?require('./node_modules/object-hash'):require('../../packages/vobject-hash');let calls=0;const inputs=[];const hash=value=>{calls++;assert.equal(typeof value,'string');inputs.push(value);return base(value);};
 const {GrpcClient}=load('grpc.js',hash),{GrpcClient:Fallback}=load('fallback.js',hash);
 for(const Client of [GrpcClient,Fallback]){
  Client.clearProtoCache();const client=new Client({auth:{}}),source=structuredClone(schema),before=JSON.stringify(source);
  const first=client.loadProtoJSON(source),cached=client.loadProtoJSON(structuredClone(source));assert.equal(cached,first);
  const key=base(before);assert.equal(Client.protoCache.get(key),first);
  const forced=client.loadProtoJSON(source,true);assert.notEqual(forced,first);assert.equal(Client.protoCache.get(key),forced);
  const other=structuredClone(source);other.nested.fixture.nested.Item.fields.extra={type:'bool',id:3};assert.notEqual(client.loadProtoJSON(other),forced);
  const reordered={nested:{fixture:{nested:{Catalog:source.nested.fixture.nested.Catalog,Item:source.nested.fixture.nested.Item}}}};
  assert.notEqual(client.loadProtoJSON(reordered),forced); // gax serializes JSON in insertion order.
  assert.equal(JSON.stringify(source),before);
  if(Client===GrpcClient){const data=forced.fixture.Catalog.service.Get.requestSerialize({name:'test',count:7});assert.equal(forced.fixture.Catalog.service.Get.requestDeserialize(data).count,7);}
  else{const Item=forced.lookupType('fixture.Item');const data=Item.encode(Item.create({name:'test',count:7})).finish();assert.equal(Item.decode(data).name,'test');}
  Client.clearProtoCache();assert.equal(Client.protoCache.size,0);assert.notEqual(client.loadProtoJSON(source),forced);Client.clearProtoCache();
 }
 assert.equal(calls,12);assert(inputs.every(s=>base(s)===require('./node_modules/object-hash')(s)));
 console.log(`${upstream?'Upstream':'VPM'} object-hash: 12 calls through google-gax 6.14.0 gRPC/fallback protobuf caches; hits, misses, forced reload, clear, exact cache keys, unchanged inputs and real message round trips.`);
 return calls;
}
module.exports=run;if(require.main===module)run(process.argv.includes('--upstream'));
