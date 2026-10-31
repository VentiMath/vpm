'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),grpc=require('..');
const {StreamDecoder}=require('../build/src/stream-decoder');
function frame(body,flag=0){const out=Buffer.alloc(body.length+5);out[0]=flag;out.writeUInt32BE(body.length,1);Buffer.from(body).copy(out,5);return out;}
test('metadata maps preserve legal special keys without changing object prototypes',()=>{
  const m=new grpc.Metadata();m.set('__proto__','safe');m.set('constructor','own');m.set('toString','text');
  for(const [result,expected] of [[m.getMap(),'safe'],[m.toHttp2Headers(),'safe'],[m.toJSON(),['safe']]]) {
    assert.equal(Object.getPrototypeOf(result),Object.prototype);assert.ok(Object.hasOwn(result,'__proto__'));
    assert.deepEqual(result.__proto__,expected);
    assert.ok(JSON.stringify(result).includes('"__proto__"'));
  }
  assert.equal({}.safe,undefined);
});
test('custom binary metadata splits combined arrays and normalizes case before decoding',()=>{
  const headers={'X-Trace-BIN':['YQ==, Yg==','Yw'],':status':200,'X-Text':'value'};
  const m=grpc.Metadata.fromHttp2Headers(headers);
  assert.deepEqual(m.get('x-trace-bin').map(v=>v.toString()),['a','b','c']);
  assert.deepEqual(m.get('x-text'),['value']);assert.deepEqual(m.get(':status'),[]);
  assert.deepEqual(headers['X-Trace-BIN'],['YQ==, Yg==','Yw']);
  const reserved=grpc.Metadata.fromHttp2Headers({'grpc-status-details-bin':'YQ=='});assert.equal(reserved.get('grpc-status-details-bin')[0].toString(),'a');
});
test('metadata buffer cloning and ordinary validation remain intact',()=>{
  const m=new grpc.Metadata(),original=Buffer.from('abc');m.add('trace-bin',original);m.add('name','first');m.add('name','second');
  const map=m.getMap();map['trace-bin'][0]=0;assert.equal(original.toString(),'abc');
  const cloned=m.clone();cloned.get('trace-bin')[0][0]=0;assert.equal(original.toString(),'abc');
  assert.deepEqual(m.toHttp2Headers(),{'trace-bin':'YWJj',name:['first','second']});
  assert.throws(()=>m.set('name','bad\r\nvalue'));assert.throws(()=>m.set('trace-bin','text'));
});
test('package namespaces cannot write to inherited Object members',()=>{
  const def={format:'Protocol Buffer 3 DescriptorProto',type:{},fileDescriptorProtos:[]};
  for(const name of ['toString','valueOf','hasOwnProperty','__defineGetter__']) {
    const fn=Object.prototype[name];assert.equal(Object.hasOwn(fn,'VpmFixture'),false);
    const loaded=grpc.loadPackageDefinition({[name+'.VpmFixture']:def});
    assert.ok(Object.hasOwn(loaded,name));assert.equal(loaded[name].VpmFixture,def);
    assert.equal(Object.getPrototypeOf(loaded[name]),Object.prototype);assert.equal(Object.hasOwn(fn,'VpmFixture'),false);
  }
});
test('frame decoding handles every split, coalesced and empty messages with owned outputs',()=>{
  const expected=[frame(Buffer.from('hello')),frame(Buffer.alloc(0)),frame(Buffer.alloc(257,42),1)],wire=Buffer.concat(expected);
  for(let split=0;split<=wire.length;split++) {
    const d=new StreamDecoder(1024),out=[...d.write(wire.subarray(0,split)),...d.write(Buffer.alloc(0)),...d.write(wire.subarray(split))];
    assert.deepEqual(out,expected);
  }
  const d=new StreamDecoder(1024),input=Buffer.from(wire),out=d.write(input);input.fill(0);assert.deepEqual(out,expected);
  out[0].fill(0);assert.deepEqual(out[1],expected[1]);assert.deepEqual(out[2],expected[2]);
});
test('frame limits reject complete and split oversized headers before buffering their payload',()=>{
  const header=Buffer.alloc(5);header.writeUInt32BE(0xffffffff,1);
  for(const split of [0,1,2,3,4,5]) {
    const d=new StreamDecoder(1024);
    assert.throws(()=>{d.write(header.subarray(0,split));d.write(header.subarray(split));},/4294967295 vs 1024/);
    assert.equal(d.readPartialMessage.length,0);
  }
  assert.deepEqual(new StreamDecoder(0).write(frame(Buffer.alloc(0))),[frame(Buffer.alloc(0))]);
  assert.deepEqual(new StreamDecoder(-1).write(frame(Buffer.alloc(2048))),[frame(Buffer.alloc(2048))]);
});
test('fragment completion releases input chunks and does not retain the compression-flag slice',()=>{
  const d=new StreamDecoder(10000),wire=frame(Buffer.alloc(2000,7));
  d.write(wire.subarray(0,700));const out=d.write(wire.subarray(700));
  assert.deepEqual(out,[wire]);assert.deepEqual(d.readPartialMessage,[]);
  assert.notEqual(d.readCompressFlag.buffer,wire.buffer);
});
