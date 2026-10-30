'use strict';
const assert=require('node:assert/strict'),pb=require('./node_modules/protobufjs'),stock=require('./node_modules/proto3-json-serializer'),vpm=require('../../packages/vproto3-json-serializer');
const root=new pb.Root();for(const key of ['timestamp','duration','field_mask','wrappers','any','struct'])root.addJSON(pb.common['google/protobuf/'+key+'.proto'].nested);
pb.parse('syntax="proto3";message Item{bytes data=1;repeated bytes chunks=2;repeated double numbers=3;int32 count=4;map<string,int32> counts=5;}',root);const T=root.lookupType('Item'),get=n=>root.lookupType('google.protobuf.'+n);
const probes={
 'sliced byte view':s=>assert.equal(s.toProto3JSON(T.create({data:new Uint8Array([99,1,2,88]).subarray(1,3)})).data,'AQI='),
 'repeated bytes':s=>assert.deepEqual(s.toProto3JSON(T.create({chunks:[Uint8Array.of(1,2)]})).chunks,['AQI=']),
 'repeated special float':s=>assert.deepEqual(s.toProto3JSON(T.create({numbers:[NaN]})).numbers,['NaN']),
 'negative Duration output':s=>assert.equal(s.toProto3JSON(get('Duration').fromObject({seconds:-1,nanos:-500000000})),'-1.500s'),
 'negative Duration input':s=>assert.equal(s.fromProto3JSON(get('Duration'),'-1.500s').nanos,-500000000),
 'offset Timestamp nanos':s=>assert.equal(s.fromProto3JSON(get('Timestamp'),'2026-10-30T12:34:56.123+02:00').nanos,123000000),
 'invalid calendar date':s=>assert.throws(()=>s.fromProto3JSON(get('Timestamp'),'2026-02-30T00:00:00Z')),
 'FieldMask casing':s=>assert.equal(s.toProto3JSON(get('FieldMask').create({paths:['display_name']})),'displayName'),
 'Any wrapper envelope':s=>{const W=get('Int64Value'),A=get('Any'),url='type.googleapis.com/google.protobuf.Int64Value';assert.deepEqual(s.toProto3JSON(A.fromObject({type_url:url,value:W.encode(W.fromObject({value:'9007199254740993'})).finish()})),{'@type':url,value:'9007199254740993'});},
 'own prototype key':s=>{const fields=JSON.parse('{"__proto__":{"stringValue":"safe"}}');const out=s.toProto3JSON(get('Struct').create({fields}));assert(Object.hasOwn(out,'__proto__'));assert.equal(out.__proto__,'safe');},
 'malformed integer text':s=>assert.throws(()=>s.fromProto3JSON(T,{count:'12junk'})),
 'null scalar':s=>assert(!Object.hasOwn(s.fromProto3JSON(T,{count:null}),'count')),
 'nonfinite Value does not change type':s=>assert.throws(()=>s.toProto3JSON(get('Value').create({numberValue:Infinity}))),
};
for(const[name,probe]of Object.entries(probes)){assert.throws(()=>probe(stock),undefined,name+' stock control');probe(vpm);}console.log(Object.keys(probes).length+' paired serializer corrections verified on identical protobuf 7 types.');
