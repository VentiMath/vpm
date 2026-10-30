'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const upstream=require('../../../scripts/object-hash-conformance/node_modules/object-hash'),vpm=require('..'),{load,schema}=require('../../../scripts/object-hash-conformance/gax.cjs');
const cases=[],add=(name,make,validate)=>cases.push({name,make,validate});
function valueCase(name,value,options){const expected=new Set([upstream(value,options),vpm(value,options)]);add(name,lib=>()=>lib(value,options),v=>assert(expected.has(v)));}
valueCase('short string / default','projects/example/databases/(default)');
valueCase('gax JSON string / default',JSON.stringify(schema));
valueCase('64KiB string / default','x'.repeat(64*1024));
valueCase('nested record / default',{project:'example',options:{timeout:30000,retry:true},scopes:['a','b']});
valueCase('nested record / SHA256 options',{project:'example',options:{timeout:30000,retry:true}},{algorithm:'SHA256',encoding:'hex',respectType:false});
valueCase('unordered set / text',new Set(['first','second','third','é漢']));
valueCase('framed binary buffer / 64KiB',Buffer.alloc(64*1024,173));
valueCase('unordered binary buffers',new Set([Buffer.from([255]),Buffer.from([254]),'text']));
for(const [label,file]of [['gRPC','grpc.js'],['fallback','fallback.js']]){
 add('gax '+label+' proto cache hit',lib=>{const {GrpcClient}=load(file,lib),client=new GrpcClient({auth:{}});client.loadProtoJSON(schema);return()=>client.loadProtoJSON(schema);},v=>assert(label==='gRPC'?v.fixture.Catalog.service.Get: v.lookupType('fixture.Item')));
 add('gax '+label+' forced proto load',lib=>{const {GrpcClient}=load(file,lib),client=new GrpcClient({auth:{}});return()=>client.loadProtoJSON(schema,true);},v=>assert(label==='gRPC'?v.fixture.Catalog.service.Get: v.lookupType('fixture.Item')));
}
const root=path.resolve(__dirname,'..');
require('../../../scripts/bench-paired.cjs').run({root,upstream,vpm,cases,files:['index.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/object-hash-conformance/package-lock.json','../../scripts/object-hash-conformance/gax.cjs','../../scripts/object-hash-conformance/node_modules/object-hash/index.js',...['grpc.js','fallback.js'].map(f=>'../../scripts/object-hash-conformance/node_modules/google-gax/build/src/'+f)]}).catch(error=>{console.error(error);process.exitCode=1;});
