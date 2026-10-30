'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {consumer,schema,input,from}=require('../../../scripts/protobuf-conformance/consumers.cjs'),upstream=from('protobufjs'),vpm=require('..'),cases=[];
function add(name,make,normalize=x=>x){const expected=normalize(make(upstream)());cases.push({name,make,validate:actual=>assert.deepEqual(normalize(actual),expected)});}
const object=x=>JSON.parse(JSON.stringify(x)),bytes=x=>Buffer.from(x);
for(const [name,definition,value]of [
 ['small numeric message','syntax="proto3"; message Item{int32 count=1; bool active=2; string name=3;}',{count:42,active:true,name:'item'}],
 ['packed numeric message','syntax="proto3"; message Item{repeated uint32 values=1;}',{values:Array.from({length:128},(_,i)=>i*17)}],
 ['nested message','syntax="proto3"; message Item{Child child=1;} message Child{string name=1; int32 n=2;}',{child:{name:'item',n:42}}],
 ['64-bit message','syntax="proto3"; message Item{int64 count=1; uint64 id=2;}',{count:'9007199254740993',id:'18446744073709551615'}],
]){
 add(name+' / encode',p=>{const T=p.parse(definition).root.lookupType('Item'),message=T.fromObject(value);return()=>T.encode(message).finish();},bytes);
 add(name+' / decode',p=>{const T=p.parse(definition).root.lookupType('Item'),wire=T.encode(T.fromObject(value)).finish();return()=>T.decode(wire);},object);
}
add('fromObject + encode / Google-shaped values',p=>{const T=p.Root.fromJSON(structuredClone(schema)).lookupType('fixture.Item');return()=>T.encode(T.fromObject(input)).finish();},bytes);
add('decode + toObject / Google-shaped values',p=>{const T=p.Root.fromJSON(structuredClone(schema)).lookupType('fixture.Item'),wire=T.encode(T.fromObject(input)).finish();return()=>T.toObject(T.decode(wire),{longs:String,bytes:Array});},object);
add('packed uint32 reader',p=>{const wire=p.Writer.create().uint32s([1,2,3,128,16384]).finish();return()=>p.Reader.create(wire).uint32s();});
add('malformed nested decode',p=>{const T=p.parse('message Item{optional Child child=1;} message Child{optional int32 n=1;}').root.lookupType('Item'),wire=Buffer.from([10,1,128]);return()=>{try{T.decode(wire);return false;}catch{return true;}};});
for(const operation of ['serialize','deserialize'])add('gRPC loader / '+operation,p=>{const c=consumer(p===upstream?'upstream':'vpm'),method=c.protoLoader().fromJSON(structuredClone(schema),{longs:String,bytes:Buffer})['fixture.Catalog'].Get,wire=method.requestSerialize(input);return operation==='serialize'?()=>method.requestSerialize(input):()=>method.requestDeserialize(wire);},operation==='serialize'?bytes:object);
for(const operation of ['encode','decode'])add('Firestore generated Document / '+operation,p=>{const c=consumer(p===upstream?'upstream':'vpm'),api=c.load(path.join(path.dirname(from.resolve('@google-cloud/firestore')),'../protos/firestore_v1_proto_api.js')),T=api.google.firestore.v1.Document,message=T.fromObject({name:'projects/example/databases/(default)/documents/items/one',fields:{count:{integerValue:'9007199254740993'},title:{stringValue:'hello'},updated:{timestampValue:{seconds:'1793397600',nanos:123456789}}}}),wire=T.encode(message).finish();return operation==='encode'?()=>T.encode(message).finish():()=>T.decode(wire);},operation==='encode'?bytes:object);
const root=path.resolve(__dirname,'..');
const files=['package.json','PROVENANCE.json','bench/compare.cjs',...['src','ext'].flatMap(dir=>fs.readdirSync(path.join(root,dir),{recursive:true}).filter(f=>f.endsWith('.js')).map(f=>dir+'/'+f)),'../vlong/index.js','../../scripts/protobuf-conformance/package-lock.json','../../scripts/protobuf-conformance/consumers.cjs',...['reader.js','decoder.js','writer.js','converter.js','util/minimal.js'].map(f=>'../../scripts/protobuf-conformance/node_modules/protobufjs/src/'+f)];
for(const file of [from.resolve('@grpc/proto-loader'),from.resolve('@google-cloud/firestore-api/build/protos/protos.js')])files.push(path.relative(root,file));
require('../../../scripts/bench-paired.cjs').run({root,upstream,vpm,cases,files}).catch(e=>{console.error(e);process.exitCode=1;});
