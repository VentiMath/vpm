'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
const upstream=require('../../../scripts/consumers/node_modules/gcp-metadata'),vpm=require('..');
const oldTransport=require('../../../scripts/consumers/node_modules/gaxios'),newTransport=require('vgaxios');
const originalOld=oldTransport.request,originalNew=newTransport.request;
const env={...process.env};for(const key of ['GCE_METADATA_IP','GCE_METADATA_HOST','METADATA_SERVER_DETECTION','DETECT_GCP_RETRIES','GOOGLE_SDK_NODE_LOGGING','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'])delete process.env[key];
const body='{"projectId":"bench-project","numericProjectId":3279739563200103600}';
const response=data=>({data,headers:{'metadata-flavor':'Google'},status:200});
const cases=[];
function stub(data){oldTransport.request=newTransport.request=async()=>response(data);}
cases.push({name:'cached residency',async:false,make:lib=>{lib.setGCPResidency(false);return()=>lib.getGCPResidency();},validate:v=>assert.equal(v,false)});
cases.push({name:'cached availability',async:true,make:async lib=>{process.env.GCE_METADATA_HOST='metadata.test';stub('{}');lib.resetIsAvailableCache();await lib.isAvailable();return()=>lib.isAvailable();},validate:v=>assert.equal(v,true)});
cases.push({name:'assume-present detection',async:true,make:lib=>{process.env.METADATA_SERVER_DETECTION='assume-present';return()=>lib.isAvailable();},validate:v=>assert.equal(v,true)});
for(const [name,data,validate] of [['JSON accessor with stub transport',body,v=>assert.equal(v.numericProjectId.valueOf(),'3279739563200103600')],['text accessor with stub transport','bench-project',v=>assert.equal(v,'bench-project')]])cases.push({name,async:true,make:lib=>{delete process.env.METADATA_SERVER_DETECTION;stub(data);return()=>lib.project('id');},validate});
let server;
(async()=>{
 server=http.createServer((req,res)=>{assert.equal(req.headers['metadata-flavor'],'Google');res.setHeader('Metadata-Flavor','Google');res.end(req.url.endsWith('/text')?'bench-project':body);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const host='http://127.0.0.1:'+server.address().port;
 for(const [name,property,validate] of [['HTTP JSON metadata','json',v=>assert.equal(v.numericProjectId.valueOf(),'3279739563200103600')],['HTTP text metadata','text',v=>assert.equal(v,'bench-project')]])cases.push({name,async:true,make:lib=>{oldTransport.request=originalOld;newTransport.request=originalNew;process.env.GCE_METADATA_HOST=host;return()=>lib.project(property);},validate});
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','residency.js','package.json','PROVENANCE.json','bench/compare.cjs','../vgaxios/lib/gaxios.js','../vgaxios/lib/retry.js','../vnode-fetch/index.js','../vjson-bigint/index.js','../vgoogle-logging-utils/index.js','../../scripts/consumers/node_modules/gcp-metadata/build/src/index.js','../../scripts/consumers/node_modules/gcp-metadata/build/src/gcp-residency.js','../../scripts/consumers/package-lock.json'],cleanup:async()=>{oldTransport.request=originalOld;newTransport.request=originalNew;for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}});
})().catch(error=>{server?.close();console.error(error);process.exitCode=1;});
