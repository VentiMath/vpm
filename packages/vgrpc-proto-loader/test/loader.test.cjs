'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const loader=require('..'),descriptor=require('vprotobufjs/ext/descriptor'),{schema,input}=require('./schema.cjs');
const options={longs:String,enums:String,bytes:Buffer,oneofs:true};
const definitions=()=>loader.fromJSON(structuredClone(schema),options);
test('exports match the runtime loading API and VPM Long',async()=>{
 const esm=await import('../index.js');for(const name of ['load','loadSync','fromJSON','loadFileDescriptorSetFromBuffer','loadFileDescriptorSetFromObject','isAnyExtension','Long','IdempotencyLevel'])assert.equal(esm[name],loader[name]);
 assert.equal(loader.Long,require('vlong'));assert.equal(loader.IdempotencyLevel.IDEMPOTENT,'IDEMPOTENT');
});
test('namespaces, descriptors and RPC aliases preserve the loader shape',()=>{
 const d=definitions();assert.deepEqual(Object.keys(d),['example.State','example.Message','example.Catalog']);
 const m=d['example.Catalog'].GetDocument;assert.equal(m.path,'/example.Catalog/GetDocument');assert.equal(m.originalName,'getDocument');
 assert.equal(d['example.State'].format,'Protocol Buffer 3 EnumDescriptorProto');assert.equal(m.requestType.format,'Protocol Buffer 3 DescriptorProto');
 assert.ok(d['example.Message'].fileDescriptorProtos.every(Buffer.isBuffer));
});
test('all four RPC streaming combinations are retained',()=>{
 const s=definitions()['example.Catalog'];for(const [name,request,response]of [['GetDocument',false,false],['ListDocuments',false,true],['Upload',true,false],['Chat',true,true]]){assert.equal(s[name].requestStream,request);assert.equal(s[name].responseStream,response);}
});
test('message codecs round-trip int64, bytes, maps, arrays, enums and oneofs',()=>{
 const m=definitions()['example.Catalog'].GetDocument;const bytes=m.requestSerialize(input);assert.ok(Buffer.isBuffer(bytes));
 assert.deepEqual(m.requestDeserialize(bytes),{...input,choice:'flag'});assert.deepEqual(m.responseDeserialize(m.responseSerialize(input)),{...input,choice:'flag'});
});
test('nested request types remain usable without adding extra top-level exports',()=>{
 const m=definitions()['example.Catalog'].Nested;assert.deepEqual(m.requestDeserialize(m.requestSerialize({value:'nested'})),{value:'nested'});
 assert.equal(m.requestType.type.name,'Nested');
});
test('output conversion options are applied to defaults and present values',()=>{
 const d=loader.fromJSON(schema,{longs:String,enums:String,bytes:String,defaults:true,oneofs:true})['example.Message'];
 assert.deepEqual(d.deserialize(d.serialize({})),{id:'0',text:'',data:'',labels:{},values:[],state:'UNKNOWN'});
 const converted=d.deserialize(d.serialize(input));assert.equal(converted.data,'AID/');assert.equal(converted.state,'READY');assert.equal(converted.choice,'flag');
});
test('default longs use the exported VPM Long',()=>{
 const d=loader.fromJSON(schema)['example.Message'];const decoded=d.deserialize(d.serialize({id:input.id}));assert.ok(decoded.id instanceof loader.Long);assert.equal(decoded.id.toString(),input.id);
});
test('arrays are rejected by both top-level and RPC serializers',()=>{
 const d=definitions();for(const fn of [d['example.Message'].serialize,d['example.Catalog'].GetDocument.requestSerialize,d['example.Catalog'].GetDocument.responseSerialize])assert.throws(()=>fn([]),/expected object with Message structure, got array instead/);
});
test('malformed wire bytes fail without poisoning later decodes',()=>{
 const m=definitions()['example.Catalog'].GetDocument;assert.throws(()=>m.requestDeserialize(Buffer.from([18,255])),RangeError);assert.equal(m.requestDeserialize(m.requestSerialize(input)).text,input.text);
});
test('public descriptors stay independently mutable despite private reuse',()=>{
 const d=definitions(),s=d['example.Catalog'];s.GetDocument.requestType.type.field[0].name='changed';
 for(const type of [s.GetDocument.responseType,s.ListDocuments.requestType,d['example.Message']])assert.equal(type.type.field[0].name,'id');
 assert.equal(s.GetDocument.requestDeserialize(s.GetDocument.requestSerialize(input)).id,input.id);
});
test('new loads observe changed input and never reuse previous public definitions',()=>{
 const json=structuredClone(schema),a=loader.fromJSON(json);json.nested.example.nested.Message.fields.extra={type:'string',id:9};const b=loader.fromJSON(json);
 assert.equal(a['example.Message'].type.field.length+1,b['example.Message'].type.field.length);assert.notEqual(a['example.Message'].fileDescriptorProtos,b['example.Message'].fileDescriptorProtos);
});
test('isAnyExtension safely narrows arbitrary values and retains inherited strings',()=>{
 for(const value of [null,undefined,0,'x',true,Symbol(),{}, {'@type':3}])assert.equal(loader.isAnyExtension(value),false);
 assert.equal(loader.isAnyExtension({'@type':'type/example.Message'}),true);assert.equal(loader.isAnyExtension(Object.create({'@type':'inherited'})),true);
});
test('method options preserve __proto__ as data without changing the prototype',()=>{
 const json=structuredClone(schema);json.nested.example.nested.Catalog.methods.GetDocument.parsedOptions=JSON.parse('[{"__proto__":{"polluted":true}},{"deprecated":true},{"uninterpreted_option":{"identifier_value":"x"}}]');
 const opts=loader.fromJSON(json)['example.Catalog'].GetDocument.options;assert.equal(Object.getPrototypeOf(opts),Object.prototype);assert.equal(opts.polluted,undefined);assert.deepEqual(opts.__proto__,{polluted:true});assert.equal(opts.deprecated,true);assert.deepEqual(opts.uninterpreted_option,[{identifier_value:'x'}]);
});
test('descriptor object and byte imports preserve map and int64 round-trips',()=>{
 const d=definitions(),set={file:d['example.Message'].fileDescriptorProtos.map(x=>descriptor.FileDescriptorProto.decode(x))},bytes=descriptor.FileDescriptorSet.encode(set).finish();
 for(const loaded of [loader.loadFileDescriptorSetFromObject(set,options),loader.loadFileDescriptorSetFromBuffer(bytes,options)]){const m=loaded['example.Catalog'].GetDocument;assert.deepEqual(m.requestDeserialize(m.requestSerialize(input)),{...input,choice:'flag'});}
});
test('descriptor imports respect Uint8Array offsets',()=>{
 const set={file:definitions()['example.Message'].fileDescriptorProtos.map(x=>descriptor.FileDescriptorProto.decode(x))},bytes=descriptor.FileDescriptorSet.encode(set).finish(),padded=Buffer.concat([Buffer.from([255,255]),bytes,Buffer.from([255])]);
 const view=new Uint8Array(padded.buffer,padded.byteOffset+2,bytes.length);assert.ok(loader.loadFileDescriptorSetFromBuffer(view)['example.Catalog']);
});
test('unresolvable types and malformed descriptors fail',async()=>{
 assert.throws(()=>loader.fromJSON({nested:{S:{methods:{Get:{requestType:'Missing',responseType:'Missing'}}}}}),/Missing/);
 assert.throws(()=>loader.loadFileDescriptorSetFromBuffer(Buffer.from([10,255])),RangeError);
 await assert.rejects(loader.load('/definitely-missing-vpm.proto'),/ENOENT/);
});
test('sync and async file imports honor includeDirs and keepCase',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vgrpc-files-'));
 try {
  fs.writeFileSync(path.join(directory,'message.proto'),'syntax="proto3";package example;message M {string snake_case=1;}');
  const file=path.join(directory,'service.proto');fs.writeFileSync(file,'syntax="proto3";package example;import "message.proto";service S {rpc Get(M) returns (M);}');
  const opts={includeDirs:[directory],keepCase:true};for(const loaded of [loader.loadSync(file,opts),await loader.load([file],opts)]){const m=loaded['example.S'].Get;assert.deepEqual(m.requestDeserialize(m.requestSerialize({snake_case:'yes'})),{snake_case:'yes'});}
  fs.writeFileSync(path.join(directory,'message.proto'),'syntax="proto3";package example;message M {string snake_case=1;string extra=2;}');assert.equal(loader.loadSync(file,opts)['example.M'].type.field.length,2);
 } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
test('invalid includeDirs throws synchronously or rejects asynchronously',async()=>{
 assert.throws(()=>loader.loadSync('x.proto',{includeDirs:'x'}),/includeDirs option must be an array/);
 await assert.rejects(loader.load('x.proto',{includeDirs:'x'}),/includeDirs option must be an array/);
});
