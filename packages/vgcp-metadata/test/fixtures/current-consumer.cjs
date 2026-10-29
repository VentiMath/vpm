'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),{createRequire}=require('node:module');
const metadata=require('../..'),transport=require('../../../vgaxios');
async function check(version) {
 const from=createRequire(path.resolve(__dirname,'../../../..','scripts/google-http-conformance/node_modules/google-auth'+version+'/package.json'));
 // Alias only this installed caller's dependencies before loading its classes.
 for(const [name,value]of Object.entries({'gcp-metadata':metadata,gaxios:transport})) {const entry=from.resolve(name);require(entry);require.cache[entry].exports=value;}
 const {Compute,GoogleAuth,gcpMetadata}=from('./build/src/index.js');assert.equal(gcpMetadata,metadata);
 const env={...process.env};for(const key of ['GCE_METADATA_IP','METADATA_SERVER_DETECTION','DETECT_GCP_RETRIES','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'])delete process.env[key];
 let universeStatus=200,tokenStatus=200,tokenReads=0,identities=0,fetches=0;
 const fetch=globalThis.fetch;globalThis.fetch=(...args)=>{fetches++;return fetch(...args);};
 const server=http.createServer((req,res)=>{
  assert.equal(req.headers['metadata-flavor'],'Google');const url=new URL(req.url,'http://metadata.test');res.setHeader('Metadata-Flavor','Google');
  if(url.pathname.endsWith('/token')){tokenReads++;res.statusCode=tokenStatus;if(tokenStatus!==200)return res.end('PRIVATE_TOKEN_FAILURE');assert.equal(url.searchParams.get('scopes'),'scope1,scope2');res.end(JSON.stringify({access_token:'metadata-access',expires_in:3600,token_type:'Bearer'}));}
  else if(url.pathname.endsWith('/identity')){identities++;assert.equal(url.searchParams.get('format'),'full');assert.equal(url.searchParams.get('audience'),'https://consumer.test');res.end('metadata-identity');}
  else if(url.pathname.endsWith('/project-id'))res.end('metadata-project');
  else if(url.pathname.endsWith('/universe-domain')){res.statusCode=universeStatus;res.end(universeStatus===200?'example-universe.test':'PRIVATE_UNIVERSE_FAILURE');}
  else if(url.pathname.endsWith('/email'))res.end('service@example.test');
  else res.end('{}');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));process.env.GCE_METADATA_HOST='http://127.0.0.1:'+server.address().port;
 metadata.resetIsAvailableCache();metadata.setGCPResidency(false);
 try{
  assert.equal(await metadata.isAvailable(),true);
  const compute=new Compute({scopes:['scope1','scope2']});const auth=new GoogleAuth();
  const token=await compute.getAccessToken();assert.equal(token.token,'metadata-access');assert(compute.credentials.expiry_date>Date.now());assert.equal((await compute.getAccessToken()).token,'metadata-access');assert.equal(tokenReads,1);
  assert.equal(await compute.fetchIdToken('https://consumer.test'),'metadata-identity');assert.equal(identities,1);
  assert.equal(await auth.getGCEProjectId(),'metadata-project');assert.equal(await auth.getUniverseDomainFromMetadataServer(),'example-universe.test');
  universeStatus=404;assert.equal(await auth.getUniverseDomainFromMetadataServer(),'googleapis.com');
  for(const status of [403,404]){tokenStatus=status;await assert.rejects(new Compute().getAccessToken(),e=>e instanceof transport.GaxiosError&&e.response.status===status&&!JSON.stringify(e).includes('PRIVATE'));}
  assert(fetches>=8);
 }finally{
  globalThis.fetch=fetch;metadata.resetIsAvailableCache();metadata.setGCPResidency(false);
  for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 }
}
check(Number(process.argv[2])).catch(error=>{console.error(error);process.exitCode=1;});
