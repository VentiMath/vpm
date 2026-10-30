'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const upstream=require('../../../scripts/camelcase-conformance/node_modules/lodash.camelcase'),vpm=require('..');
const {load,schema,names,entry,gaxEntry,firestoreSchema}=require('../../../scripts/camelcase-conformance/loader.cjs');
const cases=[],add=(name,make,validate)=>cases.push({name,make,validate});
for(const [name,text]of [
 ['short PascalCase RPC','GetDocument'],['already camelCase','batchGetDocuments'],['acronyms','XMLHttpRequest'],
 ['digits and underscores','get_v2_HTTP_response'],['Latin accents','déjà vu Æther Straße'],['Greek and CJK','ΣΊΓΜΑ 你好 世界'],
 ['joined emoji','hello 👩🏽‍💻 world 🇺🇸'],['long ASCII / 4KiB','GetDocument_'.repeat(342)],
 ['long mixed Unicode','déjà vu 👩🏽‍💻 ΣΊΓΜΑ 漢 '.repeat(64)]
]){const expected=upstream(text);add(name,lib=>()=>lib(text),value=>assert.equal(value,expected));}
const expected=names.map(upstream).join('|');
add('13 mixed RPC names',lib=>()=>names.map(lib).join('|'),value=>assert.equal(value,expected));
// Share one compiled consumer per case. Separate source evaluations can create
// different JIT/GC histories that dwarf the cost of seventeen short names.
let selected=upstream;
const loader=load(value=>selected(value)).loader;
add('gRPC loader / 13 methods',lib=>()=>{selected=lib;return loader.fromJSON(schema)['fixture.Catalog'];},value=>assert.equal(value.GetIamPolicy.originalName,'getIamPolicy'));
const firestore=JSON.parse(fs.readFileSync(firestoreSchema,'utf8'));
add('gRPC loader / Firestore schema',lib=>()=>{selected=lib;return loader.fromJSON(firestore)['google.firestore.v1.Firestore'];},value=>assert.equal(value.BatchGetDocuments.originalName,'batchGetDocuments'));
const {GrpcClient}=load(value=>selected(value)).gax(),client=new GrpcClient({auth:{}});
add('gax forced proto load / 13 methods',lib=>()=>{selected=lib;return client.loadProtoJSON(schema,true).fixture.Catalog;},value=>assert.equal(typeof value.prototype.getIamPolicy,'function'));
const root=path.resolve(__dirname,'..');
require('../../../scripts/bench-paired.cjs').run({root,upstream,vpm,cases,files:['index.js','unicode.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/camelcase-conformance/package-lock.json','../../scripts/camelcase-conformance/loader.cjs','../../scripts/camelcase-conformance/node_modules/lodash.camelcase/index.js','../../scripts/protobuf-conformance/package-lock.json',...fs.readdirSync(path.dirname(entry)).filter(f=>f.endsWith('.js')).map(f=>path.relative(root,path.join(path.dirname(entry),f))),... [gaxEntry,firestoreSchema].map(f=>path.relative(root,f))]}).catch(error=>{console.error(error);process.exitCode=1;});
