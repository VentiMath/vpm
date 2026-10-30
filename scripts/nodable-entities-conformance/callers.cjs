'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
module.exports=async function callers(upstream=false){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-nodable-entities-'));
 const modules=path.join(__dirname,'node_modules');
 assert.equal(require('./node_modules/fast-xml-parser/package.json').version,'5.11.2');
 assert.equal(require('./node_modules/fast-xml-builder/package.json').version,'1.3.1');
 fs.writeFileSync(path.join(directory,'package.json'),'{"type":"module"}');
 fs.symlinkSync(modules,path.join(directory,'node_modules'),'dir');
 for(const [name,target]of [['fast-xml-parser','parser'],['fast-xml-builder','builder']])fs.cpSync(path.join(modules,name,'src'),path.join(directory,target),{recursive:true});
 function edit(file,old,next,count=1){const dest=path.join(directory,file),source=fs.readFileSync(dest,'utf8');assert.equal(source.split(old).length,count+1,file);fs.writeFileSync(dest,source.replaceAll(old,next));}
 edit('parser/xmlparser/OrderedObjParser.js',"from '@nodable/entities'","from '../../entities.mjs'");
 edit('parser/xmlbuilder/json2xml.js',"from 'fast-xml-builder'","from '../../builder/fxb.js'",2);
 const target=upstream?path.join(modules,'@nodable/entities/src/index.js'):require.resolve('../../packages/vnodable-entities');
 const load=upstream?`import * as lib from ${JSON.stringify(pathToFileURL(target).href)};`:`import {createRequire} from 'node:module';const lib=createRequire(import.meta.url)(${JSON.stringify(target)});`;
 fs.writeFileSync(path.join(directory,'entities.mjs'),load+`
 export const calls={construct:0,decode:0,reset:0,input:0,version:0,escaped:0};
 export class EntityDecoder extends lib.EntityDecoder {
  constructor(...a){super(...a);calls.construct++;}
  decode(...a){calls.decode++;const out=super.decode(...a);if(a[0]==='payload&amp;x'){if(out!=='payload&x')throw Error('Storage entity decoding');calls.escaped++;}return out;}
  reset(...a){calls.reset++;return super.reset(...a);}
  addInputEntities(...a){calls.input++;return super.addInputEntities(...a);}
  setXmlVersion(...a){calls.version++;return super.setXmlVersion(...a);}
 }
 export const XML=lib.XML,COMMON_HTML=lib.COMMON_HTML,CURRENCY=lib.CURRENCY,ENTITY_ACTION=lib.ENTITY_ACTION;
 `);
 const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'),fixture=createRequire(storagePackage),xmlEntry=fixture.resolve('fast-xml-parser');
 assert.equal(require(storagePackage).version,'8.4.0');
 const oldXML=require(xmlEntry),prefix=path.dirname(storagePackage)+path.sep,saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 try{
  const xml=await import(pathToFileURL(path.join(directory,'parser/fxp.js')).href);
  const control=await import(pathToFileURL(path.join(modules,'fast-xml-parser/src/fxp.js')).href);
  const adapter=await import(pathToFileURL(path.join(directory,'entities.mjs')).href);
  const outcome=fn=>{try{return{value:fn()};}catch(error){return{error:error.message};}};
  const cases=[
   ['<r>&lt;&gt;&amp;&quot;&apos;</r>',{}],
   ['<r>&#65;&#x1F600;&nbsp;&copy;&euro;</r>',{htmlEntities:true}],
   ['<r>&custom;&#65;</r>',{htmlEntities:{custom:'CUSTOM'}}],
   ['<r id="&quot;x&quot;">&amp;lt;</r>',{ignoreAttributes:false}],
   ['<r>&unknown;&lt</r>',{}],
   ['<r>&lt;</r>',{processEntities:false}],
   ['<!DOCTYPE r [<!ENTITY custom "CUSTOM">]><r>&custom;</r>',{}],
   ['<!DOCTYPE r [<!ENTITY custom "<script>danger</script>">]><r>&custom;</r>',{}],
   ['<r><a>&lt;</a><b>&gt;</b></r>',{processEntities:{allowedTags:['a']}}],
   ['<r>&lt;&gt;</r>',{processEntities:{maxTotalExpansions:1,appliesTo:'all'}}],
   ['<!DOCTYPE r [<!ENTITY grow "1234567890">]><r>&grow;&grow;</r>',{processEntities:{maxExpandedLength:3}}],
   ['<?xml version="1.1"?><r>&#1;</r>',{htmlEntities:true}],
  ];
  for(const [document,options]of cases)assert.deepEqual(outcome(()=>new xml.XMLParser(options).parse(document)),outcome(()=>new control.XMLParser(options).parse(document)),document);
  const corrected=new xml.XMLParser({htmlEntities:true,parseTagValue:false}).parse('<r>&#65junk;|&#65534;</r>');assert.deepEqual(corrected,{r:upstream?'A|\ufffe':'&#65junk;|'});
  const shared=new adapter.EntityDecoder(),parser=new xml.XMLParser({entityDecoder:shared});parser.parse('<?xml version="1.1"?><r>&#1;</r>');assert.deepEqual(parser.parse('<r>&#1;</r>'),{r:upstream?'\x01':''});
  const limited=new adapter.EntityDecoder({limit:{maxTotalExpansions:1,applyLimitsTo:'all'}});const limitParser=new xml.XMLParser({entityDecoder:limited});assert.throws(()=>limitParser.parse('<r><a>&lt;</a><b>&gt;</b></r>'),/count limit/);assert.deepEqual(limitParser.parse('<r>&lt;</r>'),{r:'<'});
  const external=new xml.XMLParser();external.addEntity('brand','Acme');assert.deepEqual(external.parse('<r>&brand;</r>'),{r:'Acme'});
  assert.ok(adapter.calls.input>=2);assert.ok(adapter.calls.version>=2);
  for(const [file]of saved)delete require.cache[file];
  require.cache[xmlEntry].exports={...oldXML,XMLParser:xml.XMLParser,XMLBuilder:xml.XMLBuilder};
  const {TransferManager}=fixture('@google-cloud/storage');
  let requests=0;const beforeStorage={...adapter.calls};
  const filename=path.join(directory,'payload');fs.writeFileSync(filename,'abcd');
  for(const buffer of [false,true]){
   const seen=[];const bucket={name:'fixture',storage:{apiEndpoint:'https://storage.googleapis.com',retryOptions:{maxRetries:0,retryDelayMultiplier:1,maxRetryDelay:1,totalTimeout:10,autoRetry:false,retryableErrorFn:()=>false},authClient:{request:async options=>{
    requests++;const url=new URL(options.url);seen.push(options.method);
    if(url.searchParams.has('uploads')){const data='<InitiateMultipartUploadResult><UploadId>upload-123</UploadId><Bucket>fixture</Bucket><Key>payload&amp;x</Key></InitiateMultipartUploadResult>';return{data:buffer?Buffer.from(data):data,headers:{}};}
    assert.equal(url.searchParams.get('uploadId'),'upload-123');
    if(url.searchParams.has('partNumber')){assert.equal(url.searchParams.get('partNumber'),'1');assert.equal(Buffer.from(options.body).toString(),'abcd');assert.equal(options.headers.get('content-md5'),createHash('md5').update('abcd').digest('base64'));return{data:'',headers:{etag:'etag-1'}};}
    assert.equal(options.body,'<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>etag-1</ETag></Part></CompleteMultipartUpload>');return{data:{done:true},headers:{}};
   }}}};
   assert.equal((await new TransferManager(bucket).uploadFileInChunks(filename,{chunkSizeBytes:4,concurrencyLimit:1,maxQueueSize:1,validation:'md5'})).data.done,true);assert.deepEqual(seen,['POST','PUT','POST']);
  }
  assert.equal(requests,6);assert.ok(adapter.calls.decode>beforeStorage.decode);assert.equal(adapter.calls.construct-beforeStorage.construct,2);assert.equal(adapter.calls.reset-beforeStorage.reset,2);assert.equal(adapter.calls.escaped-beforeStorage.escaped,2);
  console.log(`${upstream?'Upstream':'VPM'} entity callers: 12 differential parser cases, malformed/forbidden NCRs, reused XML version, cumulative limits, addEntity, 2 Storage uploads / 6 requests; ${JSON.stringify(adapter.calls)}.`);
 }finally{
  require.cache[xmlEntry].exports=oldXML;for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;fs.rmSync(directory,{recursive:true,force:true});
 }
};
if(require.main===module)module.exports(process.argv.includes('--upstream')).catch(e=>{console.error(e);process.exitCode=1;});
