'use strict';
// Integration callers may replace this endpoint with their own metadata fixture.
// Outside those checks, ADC sees no credential file and a local 404, never GCE.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-integration-adc-'));
 const metadata=http.createServer((_request,response)=>{response.writeHead(404);response.end();});
 try{
  await new Promise((resolve,reject)=>{metadata.once('error',reject);metadata.listen(0,'127.0.0.1',resolve);});
  const env={...process.env,CLOUDSDK_CONFIG:directory,METADATA_SERVER_DETECTION:'ping-only',GCE_METADATA_HOST:'http://127.0.0.1:'+metadata.address().port,DETECT_GCP_RETRIES:'0'};
  for(const key of ['GOOGLE_APPLICATION_CREDENTIALS','google_application_credentials','GCE_METADATA_IP'])delete env[key];
  const child=spawn(process.execPath,[path.join(__dirname,'integration.cjs')],{env,stdio:'inherit'});
  process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??1));});
 }finally{metadata.closeAllConnections();await new Promise(resolve=>metadata.close(resolve));fs.rmSync(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
