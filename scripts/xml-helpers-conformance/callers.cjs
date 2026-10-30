'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
module.exports=async function callers(upstream=false){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-xml-helpers-'));
 const modules=path.join(__dirname,'node_modules');
 assert.equal(require('./node_modules/fast-xml-parser/package.json').version,'5.11.2');
 assert.equal(require('./node_modules/fast-xml-builder/package.json').version,'1.3.1');
 fs.writeFileSync(path.join(directory,'package.json'),'{"type":"module"}');
 fs.symlinkSync(modules,path.join(directory,'node_modules'),'dir');
 for(const [name,target]of [['fast-xml-parser','parser'],['fast-xml-builder','builder']])fs.cpSync(path.join(modules,name,'src'),path.join(directory,target),{recursive:true});
 function edit(file,old,next,count=1){const dest=path.join(directory,file),source=fs.readFileSync(dest,'utf8');assert.equal(source.split(old).length,count+1,file);fs.writeFileSync(dest,source.replaceAll(old,next));}
 edit('parser/xmlparser/DocTypeReader.js',"from 'xml-naming'","from '../../naming.mjs'");
 edit('parser/xmlparser/OrderedObjParser.js','from "is-unsafe"','from "../../unsafe.mjs"');
 edit('parser/xmlbuilder/json2xml.js',"from 'fast-xml-builder'","from '../../builder/fxb.js'",2);
 for(const file of ['fxb.js','orderedJs2Xml.js'])edit('builder/'+file,"from 'xml-naming'","from '../naming.mjs'");
 for(const [name,adapter,names]of [['xml-naming','naming',['qName','createValidator']],['is-unsafe','unsafe',['isUnsafe']]]){
  const target=upstream?path.join(modules,name,'src/index.js'):require.resolve('../../packages/v'+name);
  const load=upstream?`import * as lib from ${JSON.stringify(pathToFileURL(target).href)};`:`import {createRequire} from 'node:module';const lib=createRequire(import.meta.url)(${JSON.stringify(target)});`;
  fs.writeFileSync(path.join(directory,adapter+'.mjs'),load+'\nexport const calls={};\n'+names.map(key=>`export function ${key}(...args){calls.${key}=(calls.${key}||0)+1;return lib.${key}(...args);}`).join('\n')+(name==='is-unsafe'?'\nexport const HTML=lib.HTML,XML=lib.XML;':'')+'\n');
 }
 const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'),fixture=createRequire(storagePackage),xmlEntry=fixture.resolve('fast-xml-parser');
 assert.equal(require(storagePackage).version,'8.4.0');
 const oldXML=require(xmlEntry),prefix=path.dirname(storagePackage)+path.sep,saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 try{
  const xml=await import(pathToFileURL(path.join(directory,'parser/fxp.js')).href);
  const control=await import(pathToFileURL(path.join(modules,'fast-xml-parser/src/fxp.js')).href);
  const naming=await import(pathToFileURL(path.join(directory,'naming.mjs')).href),unsafe=await import(pathToFileURL(path.join(directory,'unsafe.mjs')).href);
  const outcome=fn=>{try{return{value:fn()};}catch(error){return{error:error.message};}};
  const documents=['<r><PartNumber>1</PartNumber><ETag>&quot;abc&quot;</ETag></r>','<!DOCTYPE r [<!ENTITY greeting "hello">]><r>&greeting;</r>','<!DOCTYPE r [<!ENTITY danger "<script>alert(1)</script>">]><r>&danger;</r>','<!DOCTYPE r [<!ENTITY danger "<!--comment-->">]><r>&danger;</r>','<!DOCTYPE r [<!ELEMENT r (#PCDATA)>]><r>hello</r>','<!DOCTYPE r [<!ENTITY 1bad "hello">]><r/>'];
  for(const document of documents)assert.deepEqual(outcome(()=>new xml.XMLParser().parse(document)),outcome(()=>new control.XMLParser().parse(document)),document);
  assert.ok(unsafe.calls.isUnsafe>=3,'entity checks were not reached');
  const supplementary='<!DOCTYPE r [<!ENTITY 𐀀 "hello">]><r>&𐀀;</r>';
  if(upstream)assert.throws(()=>new xml.XMLParser().parse(supplementary),/Invalid entity name/);
  else assert.deepEqual(new xml.XMLParser().parse(supplementary),{r:'hello'});
  // XMLValidator has its own BMP-only grammar, outside this replacement.
  assert.equal(xml.XMLValidator.validate('<𐀀/>').err.code,'InvalidTag');
  let repairs=0;
  const builder=new xml.XMLBuilder({sanitizeName:()=>{repairs++;return 'repaired';},ignoreAttributes:false});
  assert.equal(builder.build({'svg:circle':{'@_id':'x','#text':'value'}}),'<svg:circle id="x">value</svg:circle>');
  assert.equal(builder.build({'1bad':'value'}),'<repaired>value</repaired>');
  assert.equal(builder.build({'𐀀':'value'}),upstream?'<repaired>value</repaired>':'<𐀀>value</𐀀>');
  assert.equal(repairs,upstream?2:1);
  const ordered=new xml.XMLBuilder({preserveOrder:true,sanitizeName:()=> 'repaired'});
  assert.equal(ordered.build([{'1bad':[{'#text':'value'}]}]),'<repaired>value</repaired>');
  assert.equal(ordered.build([{'𐀀':[{'#text':'value'}]}]),upstream?'<repaired>value</repaired>':'<𐀀>value</𐀀>');
  assert.ok(naming.calls.qName>=5);assert.ok(naming.calls.createValidator>=5);
  for(const [file]of saved)delete require.cache[file];
  require.cache[xmlEntry].exports={...oldXML,XMLParser:xml.XMLParser,XMLBuilder:xml.XMLBuilder};
  const {TransferManager}=fixture('@google-cloud/storage');
  let requests=0;const beforeStorage={...naming.calls},beforeUnsafe=unsafe.calls.isUnsafe;
  const filename=path.join(directory,'payload');fs.writeFileSync(filename,'abcd');
  for(const buffer of [false,true]){
   const seen=[];const bucket={name:'fixture',storage:{apiEndpoint:'https://storage.googleapis.com',retryOptions:{maxRetries:0,retryDelayMultiplier:1,maxRetryDelay:1,totalTimeout:10,autoRetry:false,retryableErrorFn:()=>false},authClient:{request:async options=>{
    requests++;const url=new URL(options.url);seen.push(options.method);
    if(url.searchParams.has('uploads')){const data='<InitiateMultipartUploadResult><UploadId>upload-123</UploadId><Bucket>fixture</Bucket><Key>payload</Key></InitiateMultipartUploadResult>';return{data:buffer?Buffer.from(data):data,headers:{}};}
    assert.equal(url.searchParams.get('uploadId'),'upload-123');
    if(url.searchParams.has('partNumber')){assert.equal(url.searchParams.get('partNumber'),'1');assert.equal(Buffer.from(options.body).toString(),'abcd');assert.equal(options.headers.get('content-md5'),createHash('md5').update('abcd').digest('base64'));return{data:'',headers:{etag:'etag-1'}};}
    assert.equal(options.body,'<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>etag-1</ETag></Part></CompleteMultipartUpload>');return{data:{done:true},headers:{}};
   }}}};
   assert.equal((await new TransferManager(bucket).uploadFileInChunks(filename,{chunkSizeBytes:4,concurrencyLimit:1,maxQueueSize:1,validation:'md5'})).data.done,true);assert.deepEqual(seen,['POST','PUT','POST']);
  }
  assert.equal(requests,6);assert.equal(naming.calls.createValidator-beforeStorage.createValidator,2);
  assert.equal(naming.calls.qName,beforeStorage.qName);assert.equal(unsafe.calls.isUnsafe,beforeUnsafe);
  console.log(`${upstream?'Upstream':'VPM'} XML callers: 6 differential parser cases, supplementary entity, 5 builder cases, 2 Storage multipart uploads / 6 requests; naming=${JSON.stringify(naming.calls)}, unsafe=${JSON.stringify(unsafe.calls)}.`);
 }finally{
  require.cache[xmlEntry].exports=oldXML;for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;fs.rmSync(directory,{recursive:true,force:true});
 }
};
if(require.main===module)module.exports(process.argv.includes('--upstream')).catch(e=>{console.error(e);process.exitCode=1;});
