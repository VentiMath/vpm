'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module');
const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json');
const fixture=createRequire(storagePackage);
module.exports=async function checkCallers(library=require('../../packages/vpaginator')){
 assert.equal(require(storagePackage).version,'8.4.0');assert.equal(fixture('@google-cloud/paginator/package.json').version,'7.2.0');
 const entry=fixture.resolve('@google-cloud/paginator'),previous=require(entry),prefix=path.dirname(storagePackage)+path.sep;
 const saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));for(const [file]of saved)delete require.cache[file];
 let uses=0;const paginator=library.paginator,original=paginator.runAsStream_;
 paginator.runAsStream_=function(...args){uses++;return original.apply(this,args);};
 require.cache[entry].exports={...library,paginator};
 try{
  const {Storage}=fixture('@google-cloud/storage'),storage=new Storage({projectId:'vpm-test'}),bucket=storage.bucket('vpm-test-bucket');
  let requests=[];
  const request=function(options,cb){requests.push(options);const second=options.qs.pageToken==='second';const item=options.uri==='/o'?{name:second?'file-b':'file-a',generation:'1'}:options.uri==='/b'?{id:second?'bucket-b':'bucket-a'}:{accessId:second?'hmac-b':'hmac-a',projectId:'vpm-test'};setImmediate(()=>cb(null,{items:[item],...(second?{}:{nextPageToken:'second'}),marker:second?'last':'first'}));};
  storage.request=request;bucket.request=request;
  for(const [client,name,field,expected]of [[storage,'getBuckets','name',['bucket-a','bucket-b']],[storage,'getHmacKeys','id',['hmac-a','hmac-b']],[bucket,'getFiles','name',['file-a','file-b']]]){
   requests=[];const query={prefix:'test'},[rows,,response]=await client[name](query);assert.deepEqual(rows.map(x=>x[field]),expected);assert.equal(response.marker,'last');assert.equal(requests.length,2);assert.deepEqual(query,{prefix:'test'});
   requests=[];await new Promise((resolve,reject)=>client[name]({},(e,items,_q,resp)=>{try{assert.ifError(e);assert.deepEqual(items.map(x=>x[field]),expected);assert.equal(resp.marker,'last');resolve();}catch(e){reject(e);}}));assert.equal(requests.length,2);
   requests=[];const [one,next]=await client[name]({autoPaginate:false});assert.equal(one.length,1);assert.equal(next.pageToken,'second');assert.equal(requests.length,1);
   requests=[];const streamed=[];for await(const row of client[name+'Stream']({highWaterMark:1}))streamed.push(row[field]);assert.deepEqual(streamed,expected);assert.equal(requests.length,2);
   requests=[];const capped=[];for await(const row of client[name+'Stream']({maxApiCalls:1}))capped.push(row);assert.equal(capped.length,1);assert.equal(requests.length,1);assert.equal(requests[0].qs.maxApiCalls,undefined);
   requests=[];const limited=[];for await(const row of client[name+'Stream']({maxResults:1}))limited.push(row);assert.equal(limited.length,1);assert.equal(requests.length,1);
  }
  const failure=Error('listing failed');storage.request=(_q,cb)=>setImmediate(()=>cb(failure));await assert.rejects(storage.getBuckets(),error=>error===failure);
  assert.equal(uses,16);console.log('paginator callers: Storage 8.4.0 buckets, files and HMAC keys; promises, callbacks, manual pages, streams, result/request caps and errors; 16 adapter instances verified.');
 }finally{
  paginator.runAsStream_=original;require.cache[entry].exports=previous;for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;
 }
};
if(require.main===module)module.exports(process.argv.includes('--upstream')?fixture('@google-cloud/paginator'):undefined).catch(error=>{console.error(error);process.exitCode=1;});
