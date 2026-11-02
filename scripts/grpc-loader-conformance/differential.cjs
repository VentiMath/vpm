'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const vpm=require('../../packages/vgrpc-proto-loader'),{upstream,upstreamOnPB8,entry,firestoreSchema,plain}=require('./consumers.cjs'),{schema,input}=require('../../packages/vgrpc-proto-loader/test/schema.cjs');
assert.equal(require('./node_modules/@grpc/proto-loader/package.json').version,'0.8.1');
for(const[file,hash]of Object.entries(require('../../packages/vgrpc-proto-loader/PROVENANCE.json').upstream.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(path.dirname(entry),file))).digest('hex'),hash);
// Base64 preserves exact bytes while keeping descriptor failure output bounded.
function compact(value){if(value instanceof Uint8Array)return {wireBytes:Buffer.from(value).toString('base64')};if(typeof value==='function')return '<function>';if(Array.isArray(value))return value.map(compact);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,compact(v)]));return value;}
function equivalent(a,b){assert.deepEqual(compact(a),compact(b));}
const sameEngine=upstreamOnPB8();let comparisons=0;
for(const longs of [undefined,String,Number])for(const enums of [undefined,String])for(const bytes of [undefined,String,Array])for(const defaults of [false,true]){
 const opts={longs,enums,bytes,defaults,oneofs:true};
 const selected=vpm.fromJSON(structuredClone(schema),opts),baseline=upstream.fromJSON(structuredClone(schema),opts);
 equivalent(selected,sameEngine.fromJSON(structuredClone(schema),opts));comparisons++;
 for(const name of ['GetDocument','ListDocuments','Upload','Chat']){
  const a=selected['example.Catalog'][name],b=baseline['example.Catalog'][name];
  assert.equal(a.path,b.path);assert.equal(a.originalName,b.originalName);assert.equal(a.requestStream,b.requestStream);assert.equal(a.responseStream,b.responseStream);
  assert.deepEqual(Buffer.from(a.requestSerialize(input)),Buffer.from(b.requestSerialize(input)));
  assert.deepEqual(plain(a.responseDeserialize(b.responseSerialize(input))),plain(b.responseDeserialize(a.responseSerialize(input))));comparisons++;
 }
}
const fire=JSON.parse(fs.readFileSync(firestoreSchema,'utf8'));
equivalent(vpm.fromJSON(fire),sameEngine.fromJSON(fire));comparisons++;
for(const filename of ['enums.proto','messages.proto','rpc.proto','well_known.proto']){
 const file=path.join(__dirname,'upstream/test_protos',filename);equivalent(vpm.loadSync(file),sameEngine.loadSync(file));comparisons++;
}
const malicious=structuredClone(schema);malicious.nested.example.nested.Catalog.methods.GetDocument.parsedOptions=JSON.parse('[{"__proto__":{"polluted":true}}]');
const old=upstream.fromJSON(malicious)['example.Catalog'].GetDocument.options,fixed=vpm.fromJSON(malicious)['example.Catalog'].GetDocument.options;
assert.equal(old.polluted,true);assert.notEqual(Object.getPrototypeOf(old),Object.prototype);assert.equal(fixed.polluted,undefined);assert.equal(Object.getPrototypeOf(fixed),Object.prototype);assert.deepEqual(fixed.__proto__,{polluted:true});
for(const value of [null,undefined,1,'text',true]){assert.throws(()=>upstream.isAnyExtension(value),TypeError);assert.equal(vpm.isAnyExtension(value),false);}
const desc=require('../../packages/vprotobufjs/ext/descriptor'),initial=vpm.fromJSON(schema),set={file:initial['example.Message'].fileDescriptorProtos.map(b=>desc.FileDescriptorProto.decode(b))},wire=desc.FileDescriptorSet.encode(set).finish();
assert.throws(()=>upstream.loadFileDescriptorSetFromBuffer(wire)['example.Catalog'].GetDocument.requestSerialize(input),/labels: array expected/);
const round=vpm.loadFileDescriptorSetFromBuffer(wire,{longs:String})['example.Catalog'].GetDocument;assert.deepEqual(round.requestDeserialize(round.requestSerialize(input)).labels,input.labels);
console.log(`${comparisons} definition/wire/conversion comparisons passed across 36 option combinations, full Firestore schema and four .proto fixtures. Original-loader/protobuf-8 descriptor data matches exactly; stock protobuf-7 wire bytes match. Controls reproduce prototype mutation, unsafe Any narrowing and the protobuf-7 descriptor-map failure.`);
