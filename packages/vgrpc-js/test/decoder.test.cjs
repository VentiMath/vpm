'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{StreamDecoder}=require('../build/src/stream-decoder');
const frame=(n,flag=0)=>{const b=Buffer.alloc(n+5,23);b[0]=flag;b.writeUInt32BE(n,1);return b};
test('every header split owns partial bytes and supports zero-length writes',()=>{
 const wire=frame(20,1);
 for(let split=1;split<wire.length;split++){const d=new StreamDecoder(100),first=Buffer.from(wire.subarray(0,split));assert.deepEqual(d.write(first),[]);first.fill(0);assert.deepEqual(d.write(Buffer.alloc(0)),[]);assert.deepEqual(d.write(wire.subarray(split)),[wire]);}
});
test('one-byte payload fragmentation uses logarithmic bounded buffer allocations',()=>{
 const wire=frame(65536),d=new StreamDecoder(wire.length),alloc=Buffer.allocUnsafe,capacities=[];let out=[];
 Buffer.allocUnsafe=function(size){capacities.push(size);return alloc(size)};
 try{d.write(wire.subarray(0,5));for(let i=5;i<wire.length;i++)out.push(...d.write(wire.subarray(i,i+1)))}finally{Buffer.allocUnsafe=alloc}
 assert.deepEqual(out,[wire]);assert(capacities.length<=10);assert(capacities.every(size=>size<=wire.length));assert(capacities.reduce((a,b)=>a+b,0)<=3*wire.length);
});
test('header-only large frames do not reserve advertised payloads and oversize errors stay terminal',()=>{
 const header=frame(0);header.writeUInt32BE(0xffffffff,1);const d=new StreamDecoder(-1),alloc=Buffer.allocUnsafe,capacities=[];
 Buffer.allocUnsafe=function(size){capacities.push(size);return alloc(size)};
 try{assert.deepEqual(d.write(header),[]);d.write(Buffer.from([7]));}finally{Buffer.allocUnsafe=alloc}
 assert.deepEqual(capacities,[261]);
 const limited=new StreamDecoder(10);let failure;try{limited.write(header)}catch(e){failure=e}assert(failure);assert.throws(()=>limited.write(frame(0)),e=>e===failure);
});
test('coalesced and fragmented outputs own their memory across subsequent writes',()=>{
 const wire=Buffer.concat([frame(0),frame(500),frame(3,1)]),saved=Buffer.from(wire),d=new StreamDecoder(1000),first=d.write(wire.subarray(0,10)),last=d.write(wire.subarray(10));wire.fill(0);assert.deepEqual(Buffer.concat([...first,...last]),saved);last[0].fill(0);assert.deepEqual(last[1],frame(3,1));assert.deepEqual(d.write(frame(1)),[frame(1)]);
});
