'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const Own=require('..'),Up=require('../../../scripts/varint-conformance/node_modules/buffer-builder');
test('all documented writers, ranged copies and lengths agree across growth boundaries',()=>{
  for(const capacity of [0,1,8,64]){
    const own=new Own(capacity),ref=new Up(capacity);
    const operations=[['appendString','größer'],['appendStringZero','é','utf16le'],['appendBuffer',Buffer.from([0,250])],['appendFill',42,7],
      ['appendUInt8',255],['appendInt8',-128]];
    for(const endian of ['LE','BE']){
      for(const bits of [16,32]) operations.push(['appendInt'+bits+endian,-32],['appendUInt'+bits+endian,2**bits-1]);
      operations.push(['appendFloat'+endian,.125],['appendDouble'+endian,Math.PI]);
    }
    for(const [method,...args] of operations){
      assert.equal(own[method](...args),own);ref[method](...args);
      assert.equal(own.length,ref.length);assert.deepEqual(own.get(),ref.get());
    }
    for(const start of [0,1,8,own.length-1])for(const targetSize of [2,15,128]){
      const a=Buffer.alloc(targetSize,13),b=Buffer.from(a);
      assert.equal(own.copy(a,1,start,own.length),ref.get().copy(b,1,start,ref.length));assert.deepEqual(a,b);
    }
  }
});
test('snapshots and copied inputs stay independent; invalid appends preserve written bytes',()=>{
  const b=new Own(1), source=Buffer.from([7,8]);
  b.appendBuffer(source);source.fill(0);
  const out=b.get();out.fill(0);assert.deepEqual([...b.get()],[7,8]);
  for(const fn of [()=>b.appendUInt8(300),()=>b.appendInt16LE(-65536),()=>b.appendFill(0,-1),()=>b.appendString('x','bad-encoding')]){
    assert.throws(fn);assert.deepEqual([...b.get()],[7,8]);
  }
  assert.deepEqual([...b.appendString('ab!','hex').get()],[7,8,171]);
  assert.equal(b.copy(Buffer.alloc(2),0,2,2),0);
});

test('a ranged copy cannot expose reserved capacity',()=>{
  const b=new Own(64).appendUInt8(123), out=new Uint8Array(10).fill(77);
  assert.equal(b.copy(out,0,0,64),1);
  assert.equal(out[0],123);assert.ok(out.slice(1).every(n=>n===77));
  assert.throws(()=>b.copy(out,0,5,10),RangeError);
});
