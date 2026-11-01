'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
async function check(original){
 const {Storage}=original?require('./node_modules/@google-cloud/storage'):require('../../packages/vgoogle-cloud-storage');
 let attempts=0,unconditional,release;
 const started=new Promise(resolve=>release=resolve);
 const server=http.createServer(async(req,res)=>{
  for await(const chunk of req)void chunk;
  const url=new URL(req.url,'http://fixture');res.setHeader('content-type','application/json');
  const name=url.searchParams.get('name');
  if(name==='unconditional'){unconditional=res;release();return;}
  assert.equal(url.searchParams.get('ifGenerationMatch'),'0');
  if(++attempts===1){res.writeHead(503);res.end(JSON.stringify({error:{code:503,message:'retry once'}}));return;}
  res.end(JSON.stringify({name:'conditional',bucket:'fixture',size:'1'}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const storage=new Storage({projectId:'fixture',apiEndpoint:'http://127.0.0.1:'+server.address().port,useAuthWithCustomEndpoint:false,retryOptions:{autoRetry:true,maxRetries:1,maxRetryDelay:1,retryDelayMultiplier:1,totalTimeout:10}});
  const first=storage.bucket('fixture').file('unconditional').save('x',{resumable:false,validation:false});await started;
  assert.equal(storage.retryOptions.autoRetry,!original,'non-idempotent upload must not disable other requests');
  const second=storage.bucket('fixture').file('conditional').save('x',{resumable:false,validation:false,preconditionOpts:{ifGenerationMatch:0}});
  if(original)await assert.rejects(second,error=>error.code===503);else await second;
  assert.equal(attempts,original?1:2);
  unconditional.end(JSON.stringify({name:'unconditional',bucket:'fixture',size:'1'}));await first;
 }finally{if(unconditional&&!unconditional.writableEnded)unconditional.end('{}');server.closeAllConnections();await new Promise(resolve=>server.close(resolve));if(!original)require('../../packages/vteeny-request').teenyRequest.close();}
}
(async()=>{await check(true);await check(false);console.log('Storage save: original shared retry failure reproduced; concurrent VPM conditional upload retries independently over HTTP.');})().catch(error=>{console.error(error);process.exitCode=1;});
