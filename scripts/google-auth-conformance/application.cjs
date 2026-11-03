'use strict';
// Identical public API scenarios run against the current upstream and VPM.
// All credentials are generated fixtures; all network traffic stays local.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {Readable}=require('node:stream');
const api=process.argv.includes('--upstream')?require('../google-http-conformance/node_modules/google-auth11'):require('../../packages/vgoogle-auth-library');
const jws=require('../../packages/vjws'),metadata=api.gcpMetadata;
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),key=pair.privateKey.export({format:'pem',type:'pkcs8'});
const credentials={type:'service_account',project_id:'fixture-project',client_email:'fixture@example.test',private_key:key,private_key_id:'fixture-key'};
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-auth-app-'));
const oldHome=os.homedir,saved={};
for(const name of ['GOOGLE_APPLICATION_CREDENTIALS','google_application_credentials','GOOGLE_CLOUD_PROJECT','GCLOUD_PROJECT','GOOGLE_CLOUD_QUOTA_PROJECT','CLOUDSDK_CONFIG','GCE_METADATA_HOST','GCE_METADATA_IP','METADATA_SERVER_DETECTION','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy']){saved[name]=process.env[name];delete process.env[name];}
process.env.CLOUDSDK_CONFIG=path.join(directory,'.config','gcloud');
os.homedir=()=>directory;
const calls=[],errors=[];let base,refreshes=0;
const idToken=audience=>jws.sign({header:{alg:'RS256',kid:'fixture-key'},payload:{aud:audience,iss:'https://accounts.google.com',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,sub:'fixture'},secret:key});
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://fixture'),chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString();
  calls.push({method:req.method,path:url.pathname});
  const json=value=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(value));};
  if(url.pathname==='/token'){
   const form=new URLSearchParams(body);refreshes++;
   if(form.has('assertion')){const assertion=form.get('assertion');assert(jws.verify(assertion,'RS256',pair.publicKey));const claims=jws.decode(assertion,{json:true}).payload;assert.equal(claims.iss,credentials.client_email);return json(claims.target_audience?{id_token:idToken(claims.target_audience)}:{access_token:'fixture-access',expires_in:3600});}
   assert.equal(form.get('grant_type'),'refresh_token');assert.equal(form.get('refresh_token'),'fixture-refresh');return json({access_token:'fixture-access',expires_in:3600,token_type:'Bearer'});
  }
  if(url.pathname.startsWith('/computeMetadata/v1/')){
   res.setHeader('Metadata-Flavor','Google');
   if(url.pathname.endsWith('/identity'))return res.end(idToken(url.searchParams.get('audience')));
   if(url.pathname.endsWith('/token')){assert.equal(url.searchParams.get('scopes'),'scope-a,scope-b');return json({access_token:'fixture-access',expires_in:3600});}
   if(url.pathname.endsWith('/email'))return res.end(credentials.client_email);
   if(url.pathname.endsWith('/project-id'))return res.end('fixture-project');
   if(url.pathname.endsWith('/universe-domain'))return res.end('googleapis.com');
   return json({name:'fixture'});
  }
  assert.equal(req.headers.authorization,'Bearer fixture-access');
  if(url.pathname.endsWith(':generateAccessToken')){const data=JSON.parse(body);assert.deepEqual(data.scope,['scope-a']);return json({accessToken:'impersonated-access',expireTime:new Date(Date.now()+3600000).toISOString()});}
  if(url.pathname.endsWith(':signBlob')){return json({signedBlob:crypto.sign('sha256',Buffer.from(JSON.parse(body).payload,'base64'),key).toString('base64')});}
  if(url.pathname.endsWith(':generateIdToken'))return json({token:idToken(JSON.parse(body).audience)});
  if(url.pathname==='/resource')return json({method:req.method,body,quota:req.headers['x-goog-user-project']||null});
  throw new Error('Unexpected local path '+url.pathname);
 }catch(error){errors.push(error);res.statusCode=500;res.end('Fixture failed');}
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 const transports=[];
 try{
  // Service account discovery, token claims, synchronous signing and Headers isolation.
  const auth=new api.GoogleAuth({credentials,scopes:['scope-a']});
  const clients=await Promise.all(Array.from({length:8},()=>auth.getClient()));assert(clients.every(client=>client===clients[0]));
  const client=clients[0];client.useJWTAccessWithScope=true;assert.equal(await auth.getProjectId(),'fixture-project');
  const headers=await auth.getRequestHeaders('https://storage.googleapis.com'),signed=headers.get('authorization').slice(7);
  assert(jws.verify(signed,'RS256',pair.publicKey));assert.equal(jws.decode(signed,{json:true}).payload.scope,'scope-a');
  headers.set('authorization','changed');assert.equal((await auth.getRequestHeaders('https://storage.googleapis.com')).get('authorization'),process.argv.includes('--upstream')?'changed':'Bearer '+signed);
  headers.set('authorization','Bearer '+signed); // Restore the poisoned upstream control before subsequent scenarios.
  assert(crypto.verify('sha256',Buffer.from('signed-data'),pair.publicKey,Buffer.from(await auth.sign('signed-data'),'base64')));
  assert.equal((await auth.getCredentials()).client_email,credentials.client_email);

  // File and stream entry points preserve project and signing identity.
  const file=path.join(directory,'service.json');fs.writeFileSync(file,JSON.stringify(credentials));
  const fileAuth=new api.GoogleAuth({keyFilename:file});assert.equal(await fileAuth.getProjectId(),'fixture-project');
  const streamAuth=new api.GoogleAuth();assert(await streamAuth.fromStream(Readable.from([JSON.stringify(credentials)])) instanceof api.JWT);
  process.env.GOOGLE_APPLICATION_CREDENTIALS=file;process.env.GOOGLE_CLOUD_QUOTA_PROJECT='quota-fixture';
  const adc=new api.GoogleAuth();assert((await adc.getClient()) instanceof api.JWT);assert.equal((await adc.getRequestHeaders('https://storage.googleapis.com')).get('x-goog-user-project'),'quota-fixture');
  assert.equal((await adc.getApplicationDefault()).projectId,'fixture-project');
  delete process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
  process.env.GOOGLE_APPLICATION_CREDENTIALS=path.join(directory,'missing');await assert.rejects(new api.GoogleAuth().getClient());
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const wellKnown=path.join(directory,'.config','gcloud');fs.mkdirSync(wellKnown,{recursive:true});
  fs.writeFileSync(path.join(wellKnown,'application_default_credentials.json'),JSON.stringify({type:'authorized_user',client_id:'fixture-client',client_secret:'fixture-secret',refresh_token:'fixture-refresh'}));
  assert((await new api.GoogleAuth().getClient()) instanceof api.UserRefreshClient);fs.rmSync(path.join(directory,'.config'),{recursive:true});

  // Refresh deduplication, real authenticated fetch and caller request ownership.
  const refresh=new api.UserRefreshClient({clientId:'fixture-client',clientSecret:'fixture-secret',refreshToken:'fixture-refresh',endpoints:{oauth2TokenUrl:base+'/token'}});transports.push(refresh.transporter);
  let events=0;refresh.on('tokens',()=>events++);const before=refreshes;
  const responses=await Promise.all(Array.from({length:8},()=>refresh.request({url:base+'/resource',proxy:false})));
  assert.equal(refreshes-before,1);assert.equal(events,1);assert(responses.every(value=>value.data.method==='GET'));
  const fetched=await refresh.fetch(base+'/resource',{method:'POST',body:'payload',headers:{'content-type':'text/plain'},proxy:false});assert.equal(fetched.data.body,'payload');
  const callbackToken=await new Promise((resolve,reject)=>refresh.getAccessToken((error,value)=>error?reject(error):resolve(value)));assert.equal(callbackToken,'fixture-access');
  const callbackResponse=await new Promise((resolve,reject)=>refresh.request({url:base+'/resource',proxy:false},(error,value)=>error?reject(error):resolve(value)));assert.equal(callbackResponse.status,200);

  // Actual JWT exchange and audience-bound identity tokens.
  const jwt=new api.JWT({email:credentials.client_email,key,scopes:['scope-a']});
  const transport=new api.gaxios.Gaxios();transports.push(transport);jwt.transporter={request:options=>transport.request({...options,url:base+'/token',proxy:false})};
  assert.equal((await jwt.authorize()).access_token,'fixture-access');assert.equal(jws.decode(await jwt.fetchIdToken('identity-audience'),{json:true}).payload.aud,'identity-audience');
  let identityCalls=0;const identity=new api.IdTokenClient({targetAudience:'identity-audience',idTokenProvider:{fetchIdToken:async audience=>{identityCalls++;return idToken(audience);}}});
  const identityHeader=await identity.getRequestHeaders();await identity.getRequestHeaders();assert.equal(identityCalls,1);assert.equal(jws.decode(identityHeader.get('authorization').slice(7),{json:true}).payload.aud,'identity-audience');

  // Metadata routes escape the audience instead of interpreting it as parameters.
  process.env.GCE_METADATA_HOST=base;metadata.resetIsAvailableCache();
  const compute=new api.Compute({scopes:['scope-a','scope-b']});assert.equal((await compute.getAccessToken()).token,'fixture-access');
  const audience='https://audience.test/?x=1&y=2';
  assert.equal(jws.decode(await compute.fetchIdToken(audience),{json:true}).payload.aud,process.argv.includes('--upstream')?'https://audience.test/?x=1':audience);
  // Paired correction: upstream's interpolation truncates a compound audience.
  const computeAuth=new api.GoogleAuth({authClient:compute});assert.equal(await computeAuth.getGCEProjectId(),'fixture-project');assert.equal(await computeAuth.getUniverseDomain(),'googleapis.com');
  assert.equal((await computeAuth.getCredentials()).client_email,credentials.client_email);
  assert(crypto.verify('sha256',Buffer.from('remote-sign'),pair.publicKey,Buffer.from(await computeAuth.sign('remote-sign',base+'/v1/projects/-/serviceAccounts/'),'base64')));
  assert((await new api.GoogleAuth().getClient()) instanceof api.Compute);

  // Impersonated ADC uses the source credential for token exchange and signing.
  const impersonated=new api.Impersonated({sourceClient:refresh,targetPrincipal:'target@example.test',targetScopes:['scope-a'],endpoint:base});
  assert.equal((await impersonated.getAccessToken()).token,'impersonated-access');
  assert(crypto.verify('sha256',Buffer.from('impersonated-sign'),pair.publicKey,Buffer.from((await impersonated.sign('impersonated-sign')).signedBlob,'base64')));
  assert.equal(jws.decode(await impersonated.fetchIdToken('impersonated-audience'),{json:true}).payload.aud,'impersonated-audience');
  assert.deepEqual(errors,[]);
  console.log((process.argv.includes('--upstream')?'Upstream 11.3.2':'VPM')+': service/file/stream/ADC, refresh/callback/fetch, JWT/identity, Compute and impersonated signing controls pass ('+calls.length+' local requests).');
 }finally{
  for(const transport of transports)transport.destroy?.();metadata.resetIsAvailableCache();os.homedir=oldHome;
  for(const [name,value]of Object.entries(saved))if(value===undefined)delete process.env[name];else process.env[name]=value;
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
