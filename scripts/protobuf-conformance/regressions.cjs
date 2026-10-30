'use strict';
const assert=require('node:assert/strict');
const probes={
 'empty message unknown group':p=>new p.Type('Empty').decode(Buffer.from([11,12])),
 'packed error restores reader bounds':p=>{const r=p.Reader.create(Buffer.from([1,128,8,1]));assert.throws(()=>r.uint32s());assert.equal(r.len,4);},
 'decode error restores reader bounds':p=>{const r=p.Reader.create(Buffer.from([128,8,1]));assert.throws(()=>new p.Type('Empty').decode(r,1));assert.equal(r.len,3);},
 'negative skip rejected':p=>assert.throws(()=>p.Reader.create(Buffer.from([0])).skip(-1)),
 'noninteger decode length rejected before reading':p=>{const r=p.Reader.create(Buffer.from([8,1]));assert.throws(()=>new p.Type('Empty').decode(r,0.5));assert.equal(r.pos,0);},
 'overlong skipped varint rejected':p=>assert.throws(()=>p.Reader.create(Buffer.from([...Array(10).fill(128),0])).skip()),
 'shared zero protected':p=>{const zero=p.util.LongBits.fromNumber(0);try{assert.throws(()=>{zero.lo=99;});}finally{if(!Object.isFrozen(zero))zero.lo=0;}},
};
function run(){const stock=require('./node_modules/protobufjs'),vpm=require('../../packages/vprotobufjs');for(const[name,probe]of Object.entries(probes)){assert.throws(()=>probe(stock),undefined,name+' upstream control');probe(vpm);}console.log(Object.keys(probes).length+' paired protobuf corrections verified.');}
module.exports={probes,run};if(require.main===module)run();
