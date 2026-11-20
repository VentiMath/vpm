'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),upstream=require.resolve('../../../scripts/varint-conformance/node_modules/buffer-builder');
const cases=[
  {name:'Sass three-byte length header and packet copy',make(file){const Builder=require(file),target=Buffer.alloc(8);return()=>{
    const header=new Builder(8).appendUInt8(128).appendUInt8(128).appendUInt8(1);
    header.copy(target);return target[0]+target[1]+target[2]+header.length;
  }},validate:n=>assert.equal(n,260)},
  {name:'write mixed fields and snapshot',make(file){const Builder=require(file);return()=>new Builder(4).appendUInt32BE(1729).appendString('résultats').appendDoubleLE(0.25).get();},
   validate:bytes=>{assert.equal(bytes.length,12+Buffer.byteLength('résultats'));assert.equal(bytes.readUInt32BE(0),1729);assert.equal(bytes.readDoubleLE(bytes.length-8),0.25);}}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/varint-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
