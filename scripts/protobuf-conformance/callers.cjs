'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{createHash}=require('node:crypto');
const {consumer,from,roots,schema,input}=require('./consumers.cjs');
function run(variant='vpm'){
 assert.equal(require('./node_modules/google-gax/package.json').version,'6.14.0');assert.equal(from('@grpc/proto-loader/package.json').version,'0.8.1');assert.equal(from('@google-cloud/firestore/package.json').version,'9.4.0');
 const a=consumer(variant),control=consumer('legacy'),opts={longs:String,bytes:Buffer},files=[from.resolve('@grpc/proto-loader'),path.join(path.dirname(from.resolve('google-gax')),'fallback.js'),path.join(path.dirname(from.resolve('@google-cloud/firestore')),'serializer.js')];
 const hashes=()=>files.map(f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex')),before=hashes();let paths=0;
 for(const mode of ['gRPC loader','gax gRPC','gax fallback']){
  function setup(c){if(mode==='gRPC loader')return c.protoLoader().fromJSON(structuredClone(schema),opts)['fixture.Catalog'].Get;
   const {GrpcClient}=c.gax(mode==='gax gRPC'?'grpc.js':'fallback.js');GrpcClient.clearProtoCache();const client=new GrpcClient({auth:{}}),root=client.loadProtoJSON(structuredClone(schema));
   if(mode==='gax gRPC')return root.fixture.Catalog.service.Get;
   const T=root.lookupType('fixture.Item');return {requestSerialize:x=>T.encode(T.fromObject(x)).finish(),requestDeserialize:b=>T.toObject(T.decode(b),opts)};
  }
  const selected=setup(a),original=setup(control);const bytes=selected.requestSerialize(input);assert.deepEqual(Buffer.from(bytes),Buffer.from(original.requestSerialize(input)));assert.deepEqual(selected.requestDeserialize(bytes),original.requestDeserialize(bytes));paths++;
 }
 // Descriptor export/import is the loader's real schema-discovery boundary.
 const loader=a.protoLoader(),initial=loader.fromJSON(structuredClone(schema),opts),sets=initial['fixture.Item'].fileDescriptorProtos;
 const descriptor=require(path.join(roots[variant],'ext/descriptor')),encoded=descriptor.FileDescriptorSet.encode({file:sets.map(bytes=>descriptor.FileDescriptorProto.decode(bytes))}).finish();
 const loaded=loader.loadFileDescriptorSetFromBuffer(Buffer.from(encoded),opts),method=loaded['fixture.Catalog'].Get;
 if(variant==='legacy')assert.throws(()=>method.requestSerialize(input),/\.fixture\.Item\.labels: array expected/,'known 7.6.6 descriptor map round-trip failure');
 else assert.equal(method.requestDeserialize(method.requestSerialize(input)).id,input.id);paths++;
 // Google fallback's actual Proto3 JSON serializer, including well-known Timestamp.
 for(const c of [a,control]){const T=c.pb.Root.fromJSON(structuredClone(schema)).lookupType('fixture.Item'),ser=c.load(from.resolve('proto3-json-serializer'));const value=T.fromObject(input),json=ser.toProto3JSON(value);const decoded=ser.fromProto3JSON(T,json);assert.equal(T.toObject(decoded,{longs:String}).id,input.id);paths++;
  const Timestamp=c.pb.Root.fromJSON(c.pb.common['google/protobuf/timestamp.proto']).lookupType('google.protobuf.Timestamp'),stamp=Timestamp.fromObject(input.stamp),wire=ser.toProto3JSON(stamp);assert.equal(wire,'2026-10-30T22:00:00.123456789Z');assert.equal(Timestamp.toObject(ser.fromProto3JSON(Timestamp,wire),{longs:String}).seconds,input.stamp.seconds);paths++;
 }
 // Real Firestore serializer plus the SDK's shipped static protobuf definitions.
 function firestore(c){const api=c.firestore(),db=new api.Firestore({projectId:'vpm-fixture',useBigInt:true}),serializer=db._serializer;
  const protos=c.load(path.join(path.dirname(from.resolve('@google-cloud/firestore')),'../protos/firestore_v1_proto_api.js'));
  const Value=protos.google.firestore.v1.Value,Document=protos.google.firestore.v1.Document;
  const values=['text',9007199254740993n,-9223372036854775808n,new Date('2026-10-30T12:34:56.789Z'),Buffer.from([0,255]),{nested:[true,null,42]}];
  const wire=[];for(const value of values){const object=serializer.encodeValue(value),bytes=Value.encode(Value.fromObject(object)).finish(),decoded=Value.toObject(Value.decode(bytes),{longs:String,bytes:Buffer,enums:String});const output=serializer.decodeValue(decoded);if(typeof value==='bigint'||typeof value==='string')assert.equal(output,value);else if(value instanceof Date)assert.equal(output.toDate().toISOString(),value.toISOString());else if(Buffer.isBuffer(value))assert.deepEqual(output,value);else assert.deepEqual(output,{nested:[true,null,42n]});wire.push(Buffer.from(bytes));paths++;}
  const doc={name:'projects/vpm-fixture/databases/(default)/documents/items/one',fields:serializer.encodeFields({count:123,precise:9007199254740993n,title:'hello'})};const bytes=Document.encode(Document.fromObject(doc)).finish();assert.equal(Document.toObject(Document.decode(bytes),{longs:String}).fields.precise.integerValue,'9007199254740993');wire.push(Buffer.from(bytes));paths++;return wire;
 }
 assert.deepEqual(firestore(a),firestore(control));assert.equal(paths,22);assert.deepEqual(hashes(),before);assert(a.stats.protobufjs>0);assert(a.stats['protobufjs/minimal']>0);assert(a.stats['protobufjs/ext/descriptor']>0);
 console.log(`${variant}: ${paths} gRPC, gax, descriptors, Proto3 JSON and Firestore paths; exact 7.x-control wire bytes and int64 values. Imports: ${JSON.stringify(a.stats)}`);if(variant==='legacy')console.log('The known protobuf 7 descriptor-map round-trip failure was asserted explicitly; upstream 8 and VPM pass it.');return paths;
}
module.exports=run;if(require.main===module)run(process.argv.includes('--upstream')?'upstream':process.argv.includes('--legacy')?'legacy':'vpm');
