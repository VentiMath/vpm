'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),pb=require('vprotobufjs'),vpm=require('..');
const {from}=require('../../../scripts/protojson-conformance/consumers.cjs'),{setup,document}=require('../../../scripts/protojson-conformance/callers.cjs'),upstream=from('proto3-json-serializer');
const root=new pb.Root();for(const n of ['timestamp','duration','wrappers','struct','any'])root.addJSON(pb.common['google/protobuf/'+n+'.proto'].nested);
pb.parse('syntax="proto3";message Small{string name=1;int32 count=2;bool active=3;}message Item{string name=1;int64 count=2;bytes data=3;repeated string tags=4;map<string,string> labels=5;google.protobuf.Timestamp time=6;}message Repeated{repeated int32 numbers=1;map<string,int32> counts=2;}message Typed{enum E{OFF=0;ON=1;}E mode=1;}',root);
const cases=[],object=x=>JSON.parse(JSON.stringify(x));
function add(name,make,normalize=object){const expected=normalize(make(upstream)());cases.push({name,make,validate:x=>assert.deepEqual(normalize(x),expected)});}
function pair(name,T,json,options){const message=upstream.fromProto3JSON(T,json);add(name+' / to JSON',s=>()=>s.toProto3JSON(message,options));add(name+' / from JSON',s=>()=>s.fromProto3JSON(T,json));}
pair('1 KiB bytes',pb.parse('message Bytes {optional bytes data=1;}').root.lookupType('Bytes'),{data:Buffer.alloc(1024,173).toString('base64')});
pair('small scalars',root.lookupType('Small'),{name:'item',count:42,active:true});
pair('Google-shaped values',root.lookupType('Item'),{name:'projects/example/items/one',count:'9007199254740993',data:'AP+A',tags:['one','two'],labels:{a:'A',b:'B'},time:'2026-10-30T12:34:56.123456789Z'});
pair('repeated and map integers',root.lookupType('Repeated'),{numbers:Array.from({length:32},(_,i)=>i),counts:{a:1,b:2,c:3}});
pair('Timestamp',root.lookupType('google.protobuf.Timestamp'),'2026-10-30T12:34:56.123456789Z');
pair('Duration',root.lookupType('google.protobuf.Duration'),'12.123456789s');
pair('Struct',root.lookupType('google.protobuf.Struct'),{name:'item',active:true,nested:{n:42},array:[1,'two',null]});
add('numeric enum / to JSON',s=>{const message=root.lookupType('Typed').fromObject({mode:1});return()=>s.toProto3JSON(message,{numericEnums:true});});
add('gax Firestore / encode request',s=>{const c=setup(s===upstream?'upstream':'vpm'),request={name:document.name,mask:{fieldPaths:['title','count']}};return()=>c.rest.encodeRequest(c.methods.GetDocument,'https','firestore.example',443,request,false,true);});
add('gax Firestore / decode response',s=>{const c=setup(s===upstream?'upstream':'vpm'),bytes=Buffer.from(JSON.stringify(document));return()=>c.rest.decodeResponse(c.methods.GetDocument,true,bytes);});
const packageRoot=path.resolve(__dirname,'..'),files=['index.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/protojson-conformance/consumers.cjs','../../scripts/protojson-conformance/callers.cjs','../../scripts/protojson-conformance/package-lock.json','../vlong/index.js',...['index','toproto3json','fromproto3json','timestamp','duration','bytes','value'].map(f=>path.relative(packageRoot,from.resolve('proto3-json-serializer/build/src/'+f))),path.relative(packageRoot,path.join(path.dirname(from.resolve('google-gax')),'fallbackRest.js'))];
for(const dir of ['src','ext'])for(const file of require('node:fs').readdirSync(path.join(packageRoot,'../vprotobufjs',dir),{recursive:true}))if(file.endsWith('.js'))files.push('../vprotobufjs/'+dir+'/'+file);
require('../../../scripts/bench-paired.cjs').run({root:packageRoot,upstream,vpm,cases,files}).catch(e=>{console.error(e);process.exitCode=1;});
