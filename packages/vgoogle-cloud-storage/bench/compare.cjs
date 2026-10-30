'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{generateKeyPairSync,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),upstream=require('../../../scripts/storage-conformance/node_modules/@google-cloud/storage'),vpm=require('..');
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const credentials={client_email:'fixture@example.iam.gserviceaccount.com',private_key:privateKey},start=new Date(Math.floor(Date.now()/1000)*1000),expires=new Date(+start+3600000),body=Buffer.alloc(64*1024,97),crc=new upstream.CRC32C();crc.update(body);
const metadata={name:'fixture.pdf',bucket:'fixture',size:String(body.length),crc32c:crc.toString(),md5Hash:createHash('md5').update(body).digest('base64'),contentType:'application/pdf'};
// Upstream's short-lived download pipelines exceed the default ten listeners.
// Apply the same threshold to both variants to exclude warning I/O from timing.
require('node:events').defaultMaxListeners=32;
const cases=[],add=(name,make,validate,async=false)=>cases.push({name,make,validate,async});
add('Storage construction',lib=>()=>new lib.Storage({projectId:'fixture-project'}),v=>assert.equal(v.projectId,'fixture-project'));
add('bucket + file handles',lib=>{const storage=new lib.Storage({projectId:'fixture-project'});return()=>storage.bucket('fixture').file('nested/fixture.pdf');},v=>assert.equal(v.name,'nested/fixture.pdf'));
for(const version of ['v2','v4'])add(version+' signed URL / RSA2048',lib=>{const file=new lib.Storage({projectId:'fixture-project',credentials}).bucket('fixture').file('nested/fixture.pdf');return()=>file.getSignedUrl({action:'read',version,expires,accessibleAt:start});},v=>assert(new URL(v[0]).searchParams.has(version==='v2'?'Signature':'X-Goog-Signature')),true);
add('CRC32C / 64KiB',lib=>()=>{const hash=new lib.CRC32C();hash.update(body);return hash.toString();},v=>assert.equal(v,metadata.crc32c));
const env={};for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy','GOOGLE_SDK_NODE_LOGGING']){env[key]=process.env[key];delete process.env[key];}
let server;
(async()=>{
 server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://fixture');res.setHeader('content-type','application/json');
  if(req.method==='POST'){const chunks=[];for await(const c of req)chunks.push(c);const uploaded=Buffer.concat(chunks);assert(uploaded.includes(body));return res.end(JSON.stringify(metadata));}
  if(u.searchParams.get('alt')==='media'){res.setHeader('content-type','application/pdf');res.setHeader('x-goog-hash','crc32c='+metadata.crc32c+',md5='+metadata.md5Hash);return res.end(body);}
  res.end(JSON.stringify(u.pathname.endsWith('/o')?{items:[metadata]}:metadata));
 }catch(error){res.statusCode=500;res.end(JSON.stringify({error:{message:error.message}}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const apiEndpoint='http://127.0.0.1:'+server.address().port;
 const bucket=lib=>new lib.Storage({projectId:'fixture-project',apiEndpoint,useAuthWithCustomEndpoint:false,retryOptions:{autoRetry:false}}).bucket('fixture');
 add('HTTP object metadata',lib=>{const file=bucket(lib).file('fixture.pdf');return()=>file.getMetadata();},v=>assert.equal(v[0].name,metadata.name),true);
 add('HTTP automatic listing / one page',lib=>{const b=bucket(lib);return()=>b.getFiles({prefix:'fixture'});},v=>{assert.equal(v[0].length,1);assert.equal(v[0][0].name,metadata.name);},true);
 add('HTTP multipart upload / 64KiB + CRC32C',lib=>{const file=bucket(lib).file('fixture.pdf');return async()=>{await file.save(body,{resumable:false});return file.metadata;};},v=>assert.equal(v.crc32c,metadata.crc32c),true);
 add('HTTP download / 64KiB + CRC32C',lib=>{const file=bucket(lib).file('fixture.pdf');return()=>file.download();},v=>assert.deepEqual(v[0],body),true);
 const files=['bench/compare.cjs','PROVENANCE.json','../../scripts/storage-conformance/package-lock.json'],seen=new Set();
 function sources(name){if(seen.has(name))return;seen.add(name);const dir=path.resolve(root,'..',name);for(const f of fs.readdirSync(dir,{recursive:true}))if(!/^(?:test|bench|node_modules)\//.test(f)&&(/\.(?:js|cjs|mjs)$/.test(f)||f==='package.json'))files.push(path.relative(root,path.join(dir,f)));for(const dep of Object.keys(require(path.join(dir,'package.json')).dependencies||{}))sources(dep);}
 sources('vgoogle-cloud-storage');
 await require('../../../scripts/bench-paired.cjs').run({root,upstream,vpm,cases,files,cleanup:async()=>{require('vteeny-request').teenyRequest.close();const pool=require('../../../scripts/storage-conformance/node_modules/teeny-request/build/src/agents').pool;for(const agent of pool.values())agent.destroy();pool.clear();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));for(const[k,v]of Object.entries(env))if(v===undefined)delete process.env[k];else process.env[k]=v;}});
})().catch(error=>{server?.closeAllConnections();server?.close();console.error(error);process.exitCode=1;});
