'use strict';
const assert=require('node:assert/strict');
const upstream=require('@grpc/grpc-js'),vpm=require('../../packages/vgrpc-js');
const OriginalDecoder=require('@grpc/grpc-js/build/src/stream-decoder').StreamDecoder,Decoder=require('../../packages/vgrpc-js/build/src/stream-decoder').StreamDecoder;
const frame=(bytes,flag=0)=>{const b=Buffer.alloc(bytes.length+5);b[0]=flag;b.writeUInt32BE(bytes.length,1);Buffer.from(bytes).copy(b,5);return b;};
let seed=12345,checks=0;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
for(let run=0;run<1500;run++) {
  const originals=Array.from({length:1+random()%8},()=>frame(Buffer.alloc(random()%200,random()%256),random()%2));
  const wire=Buffer.concat(originals),a=new OriginalDecoder(10000),b=new Decoder(10000),outA=[],outB=[];
  for(let offset=0;offset<wire.length;){const end=Math.min(wire.length,offset+1+random()%64),chunk=wire.subarray(offset,end);outA.push(...a.write(chunk));outB.push(...b.write(chunk));offset=end;}
  assert.deepEqual(outA,originals);assert.deepEqual(outB,outA);checks++;
}
for(const headers of [{'x-text':'value','x-bin':'YQ=='},{'x-bin':['YQ==','Yg=='],'names':['a','b']},{'x-bin':'YQ==, Yg==',':status':200},{'grpc-status-details-bin':'YQ=='}]) {
  const a=upstream.Metadata.fromHttp2Headers(headers),b=vpm.Metadata.fromHttp2Headers(headers);assert.deepEqual(b.getMap(),a.getMap());assert.deepEqual(b.toHttp2Headers(),a.toHttp2Headers());checks++;
}
// Original-package controls demonstrate the precise deliberate corrections.
const a=new upstream.Metadata(),b=new vpm.Metadata();a.set('__proto__','value');b.set('__proto__','value');
assert.equal(Object.hasOwn(a.getMap(),'__proto__'),false);assert.equal(b.getMap().__proto__,'value');
assert.ok(Array.isArray(Object.getPrototypeOf(a.toJSON())));assert.equal(Object.getPrototypeOf(b.toJSON()),Object.prototype);
const headers={'x-bin':['YQ==, Yg==']};assert.deepEqual(upstream.Metadata.fromHttp2Headers(headers).get('x-bin').map(x=>x.toString()),['a']);assert.deepEqual(vpm.Metadata.fromHttp2Headers(headers).get('x-bin').map(x=>x.toString()),['a','b']);
const wire=frame(Buffer.alloc(1000,7)),old=new OriginalDecoder(2000),next=new Decoder(2000);
for(const d of [old,next]){d.write(wire.subarray(0,500));d.write(wire.subarray(500));}
assert.ok(old.readPartialMessage.length>0);assert.equal(next.readPartialMessage.length,0);
const key='VpmNamespaceControl',definition={format:'Protocol Buffer 3 DescriptorProto',type:{},fileDescriptorProtos:[]};
try {upstream.loadPackageDefinition({['toString.'+key]:definition});assert.equal(Object.prototype.toString[key],definition);}finally{delete Object.prototype.toString[key];}
assert.equal(vpm.loadPackageDefinition({['toString.'+key]:definition}).toString[key],definition);assert.equal(Object.hasOwn(Object.prototype.toString,key),false);
console.log(`${checks} exact frame/metadata comparisons; original controls reproduce metadata loss/prototype changes, dropped binary values, retained chunks and inherited-namespace writes.`);
