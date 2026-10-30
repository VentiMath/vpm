'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
module.exports=async function callers(upstream=false){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-xml-parser-'));
 const target=upstream?require('./node_modules/fast-xml-parser'):require('../../packages/vfast-xml-parser');
 assert.equal(require('./node_modules/fast-xml-parser/package.json').version,'5.11.2');
 const calls={construct:0,parse:0,build:0};
 class XMLParser extends target.XMLParser {constructor(...args){super(...args);calls.construct++;}parse(...args){calls.parse++;return super.parse(...args);}}
 class XMLBuilder extends target.XMLBuilder {build(...args){calls.build++;return super.build(...args);}}
 const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'),fixture=createRequire(storagePackage),xmlEntry=fixture.resolve('fast-xml-parser');
 assert.equal(require(storagePackage).version,'8.4.0');const original=require(xmlEntry),prefix=path.dirname(storagePackage)+path.sep,saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 try{
  for(const [file]of saved)delete require.cache[file];require.cache[xmlEntry].exports={...target,XMLParser,XMLBuilder};
  const {TransferManager}=fixture('@google-cloud/storage');let requests=0,completions=0;
  for(const [inputKind,payload]of ['abcd','abcdefghij','abcdef'].entries()){
   const filename=path.join(directory,'payload');fs.writeFileSync(filename,payload);const seen=new Set(),parts=Math.ceil(payload.length/4);
   const bucket={name:'fixture',storage:{apiEndpoint:'https://storage.googleapis.com',retryOptions:{maxRetries:0,retryDelayMultiplier:1,maxRetryDelay:1,totalTimeout:10,autoRetry:false,retryableErrorFn:()=>false},authClient:{request:async options=>{
    requests++;const url=new URL(options.url);
    if(url.searchParams.has('uploads')){
     assert.equal(options.method,'POST');const xml='<?xml version="1.0" encoding="UTF-8"?><InitiateMultipartUploadResult xmlns="https://storage.googleapis.com"><UploadId>upload-123</UploadId><Bucket>fixture</Bucket><Key>café&amp;file</Key></InitiateMultipartUploadResult>';
     const bytes=Buffer.from('junk'+xml+'junk');const data=inputKind===0?xml:inputKind===1?Buffer.from(xml):bytes.subarray(4,bytes.length-4);
     return{data,headers:{}};
    }
    assert.equal(url.searchParams.get('uploadId'),'upload-123');
    if(url.searchParams.has('partNumber')){assert.equal(options.method,'PUT');const n=Number(url.searchParams.get('partNumber')),body=payload.slice((n-1)*4,n*4);assert.equal(Buffer.from(options.body).toString(),body);assert.equal(options.headers.get('content-md5'),createHash('md5').update(body).digest('base64'));seen.add(n);return{data:'',headers:{etag:'"tag&'+n+'"'}};}
    assert.equal(options.method,'POST');assert.equal(seen.size,parts);const expected=Array.from({length:parts},(_,i)=>'<Part><PartNumber>'+(i+1)+'</PartNumber><ETag>&quot;tag&amp;'+(i+1)+'&quot;</ETag></Part>').join('');assert.equal(options.body,'<CompleteMultipartUpload>'+expected+'</CompleteMultipartUpload>');completions++;return{data:{done:true},headers:{}};
   }}}};
   assert.equal((await new TransferManager(bucket).uploadFileInChunks(filename,{chunkSizeBytes:4,concurrencyLimit:2,maxQueueSize:2,validation:'md5'})).data.done,true);
  }
  assert.equal(requests,12);assert.equal(completions,3);assert.deepEqual(calls,{construct:3,parse:3,build:3});
  console.log(`${upstream?'Upstream':'VPM'} XML parser Storage callers: 3 uploads, string/Buffer/sliced Buffer responses, 12 requests, MD5 and escaped completion bodies; ${JSON.stringify(calls)}.`);
 }finally{require.cache[xmlEntry].exports=original;for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;fs.rmSync(directory,{recursive:true,force:true});}
};
if(require.main===module)module.exports(process.argv.includes('--upstream')).catch(error=>{console.error(error);process.exitCode=1;});
