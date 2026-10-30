'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {from,protobuf,roundtrip}=require('../../../scripts/long-conformance/consumers.cjs');
const upstream=from('long'),vpm=require('..'),cases=[];
function value(name,make){const expected=make(upstream)();cases.push({name,make,validate:actual=>assert.deepEqual(actual,expected)});}
value('small signed construction',L=>()=>L.fromInt(7));
value('small unsigned construction',L=>()=>L.fromInt(255,true));
for(const [label,text,unsigned,radix]of [
 ['short decimal parse','123456',false,10],['signed int64 decimal parse','-9223372036854775808',false,10],
 ['unsigned int64 decimal parse','18446744073709551615',true,10],['hexadecimal parse','fedcba9876543210',true,16],
 ['base36 parse','3w5e11264sgsf',true,36],
])value(label,L=>()=>L.fromString(text,unsigned,radix));
for(const [label,text,radix]of [['short decimal format','123456',10],['signed int64 decimal format','-9223372036854775808',10],['unsigned int64 decimal format','18446744073709551615',10],['hexadecimal format','18446744073709551615',16]]){
 value(label,L=>{const n=L.fromString(text,text[0]!=='-');return()=>n.toString(radix);});
}
for(const method of ['multiply','divide'])value(method,L=>{const a=L.fromString('1234567890123456789'),b=L.fromInt(1234567);return()=>a[method](b);});
value('eight array bytes',L=>{const bytes=[255,254,253,252,251,250,249,248];return()=>L.fromBytesLE(bytes,true);});
value('eight Uint8Array bytes',L=>{const bytes=new Uint8Array([255,254,253,252,251,250,249,248]);return()=>L.fromBytesLE(bytes,true);});
for(const legacy of [false,true]){
 value('protobuf '+(legacy?'7':'8')+' fromObject + encode',L=>roundtrip(protobuf(L,null,legacy)).encode);
 value('protobuf '+(legacy?'7':'8')+' decode + toObject',L=>{const r=roundtrip(protobuf(L,null,legacy)),bytes=r.encode();return()=>r.decode(bytes);});
}
// Constructors differ across packages; compare the public bit fields.
for(const item of cases){const make=item.make,expected=make(upstream)();if(upstream.isLong(expected))item.validate=actual=>assert.deepEqual([actual.low,actual.high,actual.unsigned],[expected.low,expected.high,expected.unsigned]);}
const root=path.resolve(__dirname,'..');
require('../../../scripts/bench-paired.cjs').run({root,upstream,vpm,cases,files:['index.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/long-conformance/package-lock.json','../../scripts/long-conformance/consumers.cjs','../../scripts/long-conformance/node_modules/long/umd/index.js',...['protobufjs','google-gax/node_modules/protobufjs'].flatMap(p=>['reader.js','writer.js','converter.js','util/minimal.js'].map(f=>'../../scripts/long-conformance/node_modules/'+p+'/src/'+f))]}).catch(error=>{console.error(error);process.exitCode=1;});
