'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),pb=require('..');
test('empty messages skip valid unknown groups and preserve them when requested',()=>{
 const Empty=new pb.Type('Empty'),bytes=Buffer.from([11,16,1,19,24,2,20,12]);
 assert.deepEqual(Empty.toObject(Empty.decode(bytes)),{});
 const reader=pb.Reader.create(bytes);reader.discardUnknown=false;const value=Empty.decode(reader);
 assert.deepEqual(Buffer.from(Empty.encode(value).finish()),bytes);
 for(const data of [[11,20],[11],[0]])assert.throws(()=>Empty.decode(Buffer.from(data)));
});
test('packed varint failures restore reader bounds and leave the next field available',()=>{
 for(const name of ['uint32s','int32s','sint32s','bools','uint64s','int64s','sint64s']){
  const reader=pb.Reader.create(Buffer.from([1,128,8,1]));assert.throws(()=>reader[name](),RangeError);assert.equal(reader.len,4);assert.equal(reader.pos,2);assert.equal(reader.tag(),8);assert.equal(reader.uint32(),1);
 }
});
test('nested, map, packed and explicit-length decoder failures restore outer bounds',()=>{
 const root=pb.parse('syntax="proto3"; message Child{int32 n=1;} message Message{Child child=1; map<string,Child> map=2; repeated int32 list=3;}').root;
 const T=root.lookupType('Message');
 for(const bytes of [[10,1,128,8,1],[18,1,128,8,1],[26,1,128,8,1]]){
  const r=pb.Reader.create(Buffer.from(bytes));assert.throws(()=>T.decode(r));assert.equal(r.len,bytes.length);
 }
 const r=pb.Reader.create(Buffer.from([128,8,1]));assert.throws(()=>T.decode(r,1));assert.equal(r.len,3);assert.equal(r.pos,1);assert.equal(r.tag(),8);
 const valid=pb.Reader.create(Buffer.from([10,2,8,3,99]));assert.equal(T.decode(valid,4).child.n,3);assert.equal(valid.len,5);assert.equal(valid.pos,4);
});
test('decode and skip reject invalid explicit lengths without moving the cursor',()=>{
 const T=new pb.Type('Empty');
 for(const length of [-1,NaN,Infinity,0.5,'1',null,2**53])for(const method of ['decode','skip']){
  const r=pb.Reader.create(Buffer.from([8,1]));assert.throws(()=>method==='skip'?r.skip(length):T.decode(r,length),RangeError);assert.equal(r.pos,0);assert.equal(r.len,2);
 }
});
test('skipped varints obey the same ten-byte bound as decoded integers',()=>{
 for(let length=1;length<=10;length++){const bytes=Buffer.alloc(length,128);bytes[length-1]=0;const r=pb.Reader.create(bytes);assert.equal(r.skip(),r);assert.equal(r.pos,length);}
 const r=pb.Reader.create(Buffer.from([...Array(10).fill(128),0]));assert.throws(()=>r.skip(),/invalid varint/);assert.equal(r.pos,10);
 assert.throws(()=>new pb.Type('Empty').decode(Buffer.from([8,...Array(10).fill(128),0])),/invalid varint/);
});
test('shared LongBits zero cannot corrupt later writer output',()=>{
 const zero=pb.util.LongBits.fromNumber(0);assert(Object.isFrozen(zero));assert.throws(()=>{zero.lo=99;},TypeError);assert.throws(()=>{pb.util.LongBits.zero={};},TypeError);
 for(const method of ['uint64','int64','sint64'])assert.deepEqual([...pb.Writer.create()[method](0).finish()],[0]);
 assert.equal(zero.zzEncode(),zero);assert.equal(zero.zzDecode(),zero);
});
test('VPM long is used for exact boundaries, strict text and decimal map keys',()=>{
 assert.equal(pb.util.Long,require('../../vlong'));
 const T=pb.parse('syntax="proto3"; message Value{int64 a=1; uint64 b=2; map<int64,string> keys=3;}').root.lookupType('Value');
 const object={a:'-9223372036854775808',b:'18446744073709551615',keys:{'9007199254740993':'value'}};
 assert.deepEqual(T.toObject(T.decode(T.encode(T.fromObject(object)).finish()),{longs:String}),object);
 assert.throws(()=>T.fromObject({a:'12junk'}));
 assert.equal(pb.Reader.create(pb.Writer.create().int64(new String('9007199254740993')).finish()).int64().toString(),'9007199254740993');
});
test('proto2, proto3 and editions retain oneofs, packed values, UTF8 and unknown-field behavior',()=>{
 for(const prefix of ['syntax="proto2";','syntax="proto3";','edition="2023";']){
  const fields=prefix.includes('proto2')?'optional string name=1; repeated sint32 numbers=2 [packed=true];':'string name=1; repeated sint32 numbers=2;';
  const T=pb.parse(prefix+'message Item{'+fields+'oneof selected{int32 a=3; string b=4;}}').root.lookupType('Item');
  const expected={name:'é漢😀',numbers:[-1,0,1,1000],b:'chosen'};const value=T.fromObject(expected);
  assert.equal(T.verify(value),null);assert.deepEqual(T.toObject(T.decode(T.encode(value).finish())),expected);
 }
});
test('descriptor, ProtoJSON and text-format extensions preserve core constructor identity',()=>{
 const descriptor=require('../ext/descriptor'),json=require('../ext/protojson'),text=require('../ext/textformat');
 const T=pb.parse('syntax="proto3"; message Item{string text=1;}').root.lookupType('Item');
 const root=pb.Root.fromDescriptor(T.root.toDescriptor('proto3'));assert(root instanceof pb.Root);assert(descriptor.FileDescriptorSet instanceof pb.Type);
 const value=T.create({text:'hello'});assert.equal(json.fromJsonString(T,json.toJsonString(T,value)).text,'hello');assert.equal(text.fromText(T,text.toText(T,value)).text,'hello');
});
test('CommonJS and native ESM full/light/minimal entries share constructors',async()=>{
 for(const entry of ['index','light','minimal']){const esm=await import('../'+entry+'.js'),cjs=require('../'+entry);assert.equal(esm.default,cjs);assert.equal(esm.Reader,pb.Reader);}
});
