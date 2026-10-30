'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createHash}=require('node:crypto'),{createRequire}=require('node:module');
const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'),fixture=createRequire(storagePackage);
module.exports=async function checkCallers(lib=require('../../packages/vasync-retry')){
 assert.equal(require(storagePackage).version,'8.4.0');assert.equal(fixture('async-retry/package.json').version,'1.3.3');
 const entry=fixture.resolve('async-retry'),previous=require(entry),prefix=path.dirname(storagePackage)+path.sep;
 const saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));
 for(const [file]of saved)delete require.cache[file];
 let operations=0,attempts=0;
 require.cache[entry].exports=(fn,options)=>{
  operations++;assert.deepEqual(options,{retries:2,factor:1,maxTimeout:1000,maxRetryTime:10000});
  // Scale only wait time; retain SDK retry counts, budgets and bail decisions.
  return lib((bail,attempt)=>{attempts++;return fn(bail,attempt);},{...options,minTimeout:1,randomize:false});
 };
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-storage-retry-')),large=path.join(directory,'large'),small=path.join(directory,'small');
 fs.writeFileSync(large,'abcdefghijkl');fs.writeFileSync(small,'abcd');
 const deadline=setTimeout(()=>{throw Error('Storage retry caller check timed out');},15000);
 const originalReadStream=fs.createReadStream;let streamFinished;
 fs.createReadStream=function(...args){const stream=originalReadStream.apply(this,args);if(streamFinished){const finish=streamFinished;stream.once('close',()=>setImmediate(finish));}return stream;};
 try{
  const {TransferManager,MultiPartUploadError}=fixture('@google-cloud/storage');
  let totalRequests=0;
  for(const scenario of ['transient','fatal-init','abort','exhausted','resume','disabled']){
   const counts=new Map(),seen=[];
   // Storage attaches batch rejection handlers after reading its final chunk.
   // Deliver terminal part failures after the stream closes, allowing batch handlers to attach;
   // immediate rejection exposes the same unhandled-rejection race upstream.
   const terminalPart=['abort','exhausted'].includes(scenario);
   const observed=terminalPart?new Promise(resolve=>{streamFinished=resolve;}):Promise.resolve();
   if(!terminalPart)streamFinished=null;
   const bucket={name:'fixture',storage:{apiEndpoint:'https://storage.googleapis.com',retryOptions:{maxRetries:2,retryDelayMultiplier:1,maxRetryDelay:1,totalTimeout:10,autoRetry:scenario!=='disabled',retryableErrorFn:error=>error.code===503},authClient:{request:async options=>{
    totalRequests++;const url=new URL(options.url),part=Number(url.searchParams.get('partNumber'));
    const kind=url.searchParams.has('uploads')?'init':options.method==='DELETE'?'abort':part?'part-'+part:'complete';
    const count=(counts.get(kind)||0)+1;counts.set(kind,count);seen.push(kind);
    if(kind!=='abort')assert.ok(options.headers.get('x-goog-api-client').includes('gccl-gcs-cmd/tm.upload_sharded'));
    if(scenario==='fatal-init'&&kind==='init')throw Object.assign(Error('denied'),{code:403});
    if(scenario==='disabled')throw Object.assign(Error('disabled'),{code:503});
    if(scenario==='transient'&&count===1&&['init','part-1','complete'].includes(kind))throw Object.assign(Error('temporary'),{code:503});
    if(scenario==='abort'&&kind==='part-1'){await observed;throw Object.assign(Error('part denied'),{code:403});}
    if(scenario==='abort'&&kind==='abort'&&count===1)throw Object.assign(Error('abort temporary'),{code:503});
    if(scenario==='exhausted'&&kind==='part-1'){await observed;throw Object.assign(Error('part unavailable'),{code:503});}
    if(kind==='init')return {data:'<InitiateMultipartUploadResult><UploadId>upload-1</UploadId></InitiateMultipartUploadResult>',headers:{}};
    assert.equal(url.searchParams.get('uploadId'),'upload-1');
    if(part){const body=Buffer.from(options.body);assert.equal(body.toString(),'abcdefghijkl'.slice((part-1+(scenario==='resume'?1:0))*4,(part+(scenario==='resume'?1:0))*4));assert.equal(options.headers.get('content-md5'),createHash('md5').update(body).digest('base64'));return{data:'',headers:{etag:'etag-'+part}};}
    if(kind==='complete'){assert.equal(options.method,'POST');assert.equal(options.body,'<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>etag-1</ETag></Part><Part><PartNumber>2</PartNumber><ETag>etag-2</ETag></Part>'+(scenario==='resume'?'':'<Part><PartNumber>3</PartNumber><ETag>etag-3</ETag></Part>')+'</CompleteMultipartUpload>');return{data:{done:true},headers:{}};}
    return{data:'',headers:{}};
   }}}};
   const manager=new TransferManager(bucket),options={chunkSizeBytes:4,concurrencyLimit:1,maxQueueSize:1,validation:'md5'};
   if(scenario==='exhausted')options.autoAbortFailure=false;
   // Current SDK resumes the byte offset but restarts part numbering at one.
   // Assert that existing caller behavior with both libraries, not upload correctness.
   if(scenario==='resume'){options.uploadId='upload-1';options.partsMap=new Map([[1,'etag-1']]);}
   const pending=manager.uploadFileInChunks(['transient','resume'].includes(scenario)?large:small,options);
   if(['fatal-init','exhausted','disabled'].includes(scenario))await assert.rejects(pending,error=>error instanceof MultiPartUploadError&&error.message.includes(scenario==='fatal-init'?'denied':scenario==='disabled'?'disabled':'unavailable'));
   else if(scenario==='abort')assert.equal(await pending,undefined); // Current SDK resolves after a successful abort.
   else assert.equal((await pending).data.done,true);
   const expected={transient:{init:2,'part-1':2,'part-2':1,'part-3':1,complete:2},'fatal-init':{init:1},abort:{init:1,'part-1':1,abort:2},exhausted:{init:1,'part-1':3},resume:{'part-1':1,'part-2':1,complete:1},disabled:{init:1}}[scenario];
   assert.deepEqual(Object.fromEntries(counts),expected,scenario);assert.equal(seen.length,Object.values(expected).reduce((a,b)=>a+b,0));
  }
  await new Promise(resolve=>setTimeout(resolve,10));assert.equal(totalRequests,21);assert.equal(operations,15);assert.equal(attempts,21);
  console.log('Storage 8.4.0: 15 retry operations / 21 attempts through multipart initiation, parts, completion, abort, resumption, fatal errors and disabled retries passed.');
 }finally{
  clearTimeout(deadline);fs.createReadStream=originalReadStream;require.cache[entry].exports=previous;
  for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;
  fs.rmSync(directory,{recursive:true,force:true});
 }
};
if(require.main===module)module.exports(process.argv.includes('--upstream')?fixture('async-retry'):undefined).catch(error=>{console.error(error);process.exitCode=1;});
