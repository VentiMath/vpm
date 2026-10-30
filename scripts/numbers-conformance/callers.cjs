'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json');
const fixture=createRequire(storagePackage),xmlEntry=fixture.resolve('fast-xml-parser');
module.exports=async function callers(upstream=false){
 assert.equal(require(storagePackage).version,'8.4.0');
 const xmlRoot=path.resolve(path.dirname(xmlEntry),'..');assert.equal(require(path.join(xmlRoot,'package.json')).version,'5.11.2');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-xml-numbers-'));
 // The distributed CJS entry bundles strnum. Exercise the same release's unbundled
 // source, changing only its strnum import, then supply that parser to Storage.
 fs.cpSync(path.join(xmlRoot,'src'),path.join(directory,'src'),{recursive:true});
 fs.writeFileSync(path.join(directory,'package.json'),'{"type":"module"}');
 fs.symlinkSync(path.dirname(xmlRoot),path.join(directory,'node_modules'),'dir');
 const parserFile=path.join(directory,'src/xmlparser/OrderedObjParser.js'),before=fs.readFileSync(parserFile,'utf8');
 assert.equal(before.split('from "strnum"').length,2);
 fs.writeFileSync(parserFile,before.replace('from "strnum"','from "../../number.mjs"'));
 const target=upstream?require.resolve('strnum'):require.resolve('../../packages/vstrnum');
 // Read the current CJS export for VPM so the root gate's counting proxy is
 // observed even if Node has already cached an ESM namespace for this module.
 const load=upstream?`import number from ${JSON.stringify(pathToFileURL(target).href)};`:`import {createRequire} from 'node:module'; const number=createRequire(import.meta.url)(${JSON.stringify(target)});`;
 fs.writeFileSync(path.join(directory,'number.mjs'),`${load}\nexport let calls=0;\nexport default function toNumber(...args){calls++;return number(...args);}\n`);
 const oldXML=require(xmlEntry),prefix=path.dirname(storagePackage)+path.sep;
 const saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 try{
  const xml=await import(pathToFileURL(path.join(directory,'src/fxp.js')).href),counter=await import(pathToFileURL(path.join(directory,'number.mjs')).href);
  const options=[{}, {ignoreAttributes:false,parseAttributeValue:true}, {numberParseOptions:{hex:false,leadingZeros:false,eNotation:false}}, {numberParseOptions:{unicode:true,binary:true,octal:true,infinity:'null'}}];
  const bodies=['<r><PartNumber>12</PartNumber><Size>4096</Size><Generation>9007199254740993</Generation><UploadId>upload-id-1</UploadId><ETag>&quot;a123&quot;</ETag></r>', '<r n="12"><a>00012</a><b>-0</b><c>1e2</c><d>0x10</d><e>0b10</e><f>true</f><g>−१२</g></r>', '<r><a>12.2500</a><b>1e309</b><c>undefined</c><d><![CDATA[12]]></d></r>'];
  const controlXML=await import(pathToFileURL(path.join(xmlRoot,'src/fxp.js')).href);
  let comparisons=0;
  for(const option of options)for(const body of bodies){
   const actual=new xml.XMLParser(option).parse(body),expected=new controlXML.XMLParser(option).parse(body);
   if(!upstream&&option.numberParseOptions?.leadingZeros===false&&body.includes('<b>-0'))expected.r.b=-0;
   assert.deepEqual(actual,expected);comparisons++;
  }
  const fixed=new xml.XMLParser({numberParseOptions:{eNotation:false,infinity:'null',leadingZeros:false}});
  assert.deepEqual(fixed.parse('<r><a>1e309</a><b>-0</b></r>'),{r:{a:upstream?null:'1e309',b:upstream?'-0':-0}});
  const unicode=new xml.XMLParser({numberParseOptions:{unicode:true}});const digits=String.fromCodePoint(0x11de1,0x11de2);assert.equal(unicode.parse(`<n>${digits}</n>`).n,upstream?digits:12);
  assert.equal(counter.calls,64);
  for(const [file]of saved)delete require.cache[file];
  require.cache[xmlEntry].exports={...oldXML,XMLParser:xml.XMLParser};
  const {TransferManager}=fixture('@google-cloud/storage');
  let requests=0,parses=counter.calls;
  const filename=path.join(directory,'payload');fs.writeFileSync(filename,'abcd');
  for(const buffer of [false,true]){
   const seen=[];const bucket={name:'fixture',storage:{apiEndpoint:'https://storage.googleapis.com',retryOptions:{maxRetries:0,retryDelayMultiplier:1,maxRetryDelay:1,totalTimeout:10,autoRetry:false,retryableErrorFn:()=>false},authClient:{request:async options=>{
    requests++;const url=new URL(options.url);seen.push(options.method);
    if(url.searchParams.has('uploads')){const data='<InitiateMultipartUploadResult><UploadId>upload-123</UploadId><Bucket>fixture</Bucket><Key>payload</Key></InitiateMultipartUploadResult>';return{data:buffer?Buffer.from(data):data,headers:{}};}
    assert.equal(url.searchParams.get('uploadId'),'upload-123');
    if(url.searchParams.has('partNumber')){assert.equal(url.searchParams.get('partNumber'),'1');assert.equal(Buffer.from(options.body).toString(),'abcd');assert.equal(options.headers.get('content-md5'),createHash('md5').update('abcd').digest('base64'));return{data:'',headers:{etag:'etag-1'}};}
    assert.equal(options.body,'<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>etag-1</ETag></Part></CompleteMultipartUpload>');return{data:{done:true},headers:{}};
   }}}};
   assert.equal((await new TransferManager(bucket).uploadFileInChunks(filename,{chunkSizeBytes:4,concurrencyLimit:1,maxQueueSize:1,validation:'md5'})).data.done,true);
   assert.deepEqual(seen,['POST','PUT','POST']);
  }
  assert.equal(requests,6);assert.equal(counter.calls-parses,6);
  console.log(`fast-xml-parser 5.11.2: ${comparisons} differential XML cases and 2 intentional-difference cases; Storage 8.4.0: 2 multipart uploads / 6 requests; ${counter.calls} instrumented strnum calls passed.`);
 }finally{
  require.cache[xmlEntry].exports=oldXML;
  for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;
  fs.rmSync(directory,{recursive:true,force:true});
 }
};
if(require.main===module)module.exports(process.argv.includes('--upstream')).catch(e=>{console.error(e);process.exitCode=1;});
