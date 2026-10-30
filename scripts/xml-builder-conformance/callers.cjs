'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
module.exports=async function callers(upstream=false){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-xml-builder-')),modules=path.join(__dirname,'node_modules');
 assert.equal(require('./node_modules/fast-xml-parser/package.json').version,'5.11.2');assert.equal(require('./node_modules/fast-xml-builder/package.json').version,'1.3.1');
 fs.writeFileSync(path.join(directory,'package.json'),'{"type":"module"}');fs.symlinkSync(modules,path.join(directory,'node_modules'),'dir');
 fs.cpSync(path.join(modules,'fast-xml-parser/src'),path.join(directory,'parser'),{recursive:true});
 const entry=path.join(directory,'parser/xmlbuilder/json2xml.js'),source=fs.readFileSync(entry,'utf8');assert.equal(source.split("from 'fast-xml-builder'").length,3);fs.writeFileSync(entry,source.replaceAll("from 'fast-xml-builder'","from '../../adapter.mjs'"));
 const target=upstream?path.join(modules,'fast-xml-builder/src/fxb.js'):require.resolve('../../packages/vfast-xml-builder');
 const load=upstream?`import Base from ${JSON.stringify(pathToFileURL(target).href)};`:`import {createRequire} from 'node:module';const Base=createRequire(import.meta.url)(${JSON.stringify(target)});`;
 fs.writeFileSync(path.join(directory,'adapter.mjs'),load+`export const calls={construct:0,build:0};export class Builder extends Base{constructor(...args){super(...args);calls.construct++;}build(...args){calls.build++;return super.build(...args);}}export default Builder;`);
 const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'),fixture=createRequire(storagePackage),xmlEntry=fixture.resolve('fast-xml-parser');
 assert.equal(require(storagePackage).version,'8.4.0');const original=require(xmlEntry),prefix=path.dirname(storagePackage)+path.sep,saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 try{
  const xml=await import(pathToFileURL(path.join(directory,'parser/fxp.js')).href),control=await import(pathToFileURL(path.join(modules,'fast-xml-parser/src/fxp.js')).href),adapter=await import(pathToFileURL(path.join(directory,'adapter.mjs')).href);
  const cases=[
   [{r:{x:['a','b'],empty:null}},{}],
   [{r:{'@_id':'"&','x':'<value>'}},{ignoreAttributes:false}],
   [{r:{'@':{id:'x'},text:'a'}},{attributesGroupName:'@'}],
   [{r:{c:']]>','comment':'a--b'}},{cdataPropName:'c',commentPropName:'comment'}],
   [{r:{raw:{'#text':'<b>raw</b>'}}},{stopNodes:['..raw']}],
   [{r:{a:'x',b:'y'}},{format:true}],
   [[{r:[{'#text':'x&y'}],':@':{'@_id':'a'}}],{preserveOrder:true,ignoreAttributes:false}],
   [{'bad name':{'@_bad attr':'x'}},{ignoreAttributes:false,sanitizeName:()=> 'valid'}],
   [[{PartNumber:1,ETag:'"a&b"'},{PartNumber:2,ETag:'c'}],{arrayNodeName:'Part'}],
  ];
  for(const [input,options]of cases)assert.equal(new xml.XMLBuilder(options).build(input),new control.XMLBuilder(options).build(input));
  for(const preserveOrder of [false,true]){const opts={preserveOrder,ignoreAttributes:false,parseTagValue:false};const input='<r id="x"><a>&lt;&amp;</a><a>text</a></r>';const parsed=new xml.XMLParser(opts).parse(input);assert.equal(new xml.XMLBuilder(opts).build(parsed),input);}
  for(const [file]of saved)delete require.cache[file];require.cache[xmlEntry].exports={...original,XMLBuilder:xml.XMLBuilder};
  const {TransferManager}=fixture('@google-cloud/storage');const before={...adapter.calls};let requests=0,completions=0;
  for(const payload of ['abcd','abcdefghij']){
   const filename=path.join(directory,'payload');fs.writeFileSync(filename,payload);const seen=new Set(),parts=Math.ceil(payload.length/4);
   const bucket={name:'fixture',storage:{apiEndpoint:'https://storage.googleapis.com',retryOptions:{maxRetries:0,retryDelayMultiplier:1,maxRetryDelay:1,totalTimeout:10,autoRetry:false,retryableErrorFn:()=>false},authClient:{request:async options=>{
    requests++;const url=new URL(options.url);
    if(url.searchParams.has('uploads')){assert.equal(options.method,'POST');return{data:'<InitiateMultipartUploadResult><UploadId>upload-123</UploadId><Bucket>fixture</Bucket><Key>payload</Key></InitiateMultipartUploadResult>',headers:{}};}
    assert.equal(url.searchParams.get('uploadId'),'upload-123');
    if(url.searchParams.has('partNumber')){assert.equal(options.method,'PUT');const n=Number(url.searchParams.get('partNumber')),body=payload.slice((n-1)*4,n*4);assert.equal(Buffer.from(options.body).toString(),body);assert.equal(options.headers.get('content-md5'),createHash('md5').update(body).digest('base64'));seen.add(n);return{data:'',headers:{etag:'"tag&'+n+'"'}};}
    assert.equal(options.method,'POST');assert.equal(seen.size,parts);const expected=Array.from({length:parts},(_,i)=>'<Part><PartNumber>'+(i+1)+'</PartNumber><ETag>&quot;tag&amp;'+(i+1)+'&quot;</ETag></Part>').join('');assert.equal(options.body,'<CompleteMultipartUpload>'+expected+'</CompleteMultipartUpload>');completions++;return{data:{done:true},headers:{}};
   }}}};
   assert.equal((await new TransferManager(bucket).uploadFileInChunks(filename,{chunkSizeBytes:4,concurrencyLimit:2,maxQueueSize:2,validation:'md5'})).data.done,true);
  }
  assert.equal(requests,8);assert.equal(completions,2);assert.equal(adapter.calls.construct-before.construct,2);assert.equal(adapter.calls.build-before.build,2);assert.deepEqual(adapter.calls,{construct:13,build:13});
  console.log(`${upstream?'Upstream':'VPM'} XML builder callers: 9 parser-export cases, 2 round trips, 2 Storage multipart uploads / 8 requests, escaped ETags and ordered completion bodies; ${JSON.stringify(adapter.calls)}.`);
 }finally{require.cache[xmlEntry].exports=original;for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;fs.rmSync(directory,{recursive:true,force:true});}
};
if(require.main===module)module.exports(process.argv.includes('--upstream')).catch(error=>{console.error(error);process.exitCode=1;});
