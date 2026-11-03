'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Readable}=require('node:stream');
const {GoogleAuth,OAuth2Client,UserRefreshClient,IdTokenClient,Impersonated}=require('..');
const {TokenHandler}=require('../lib/application/token');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('OAuth refresh failures clear in-flight state and retry without caching malformed tokens',async()=>{
 let count=0;const gate=deferred(),client=new UserRefreshClient({refreshToken:'fixture',transporter:{request:async()=>{count++;await gate.promise;return {data:{access_token:'token',expires_in:Infinity}};}}});
 const pending=Promise.allSettled(Array.from({length:12},()=>client.getAccessToken()));await tick();assert.equal(count,1);gate.resolve();
 assert((await pending).every(value=>value.status==='rejected'));assert.equal(client.credentials.access_token,undefined);
 client.transporter={request:async()=>({data:{access_token:'recovered',expires_in:3600}})};assert.equal((await client.getAccessToken()).token,'recovered');
});
test('a completed refresh cannot overwrite credentials explicitly replaced in flight',async()=>{
 const gate=deferred(),client=new UserRefreshClient({refreshToken:'old',transporter:{request:()=>gate.promise}});
 const pending=client.getAccessToken();await tick();client.setCredentials({access_token:'new',expiry_date:Date.now()+3600000,refresh_token:'new-refresh'});
 gate.resolve({data:{access_token:'old-result',expires_in:3600}});assert.equal((await pending).token,'new');assert.equal(client.credentials.refresh_token,'new-refresh');
});
test('401 reauthentication happens once for replayable requests and never replays a stream',async()=>{
 for(const body of ['payload',Readable.from(['payload']),new ReadableStream({start(controller){controller.enqueue('payload');controller.close();}})]){
  let requests=0,refreshes=0;const denied=Object.assign(new Error('unauthorized'),{response:{status:401}});
  const client=new OAuth2Client({transporter:{request:async options=>{if(String(options.url).endsWith('/token')){refreshes++;return {data:{access_token:'fresh',expires_in:3600}};}requests++;if(requests===1)throw denied;assert.equal(options.headers.get('authorization'),'Bearer fresh');return {data:'ok'};}}});
  client.setCredentials({access_token:'old',refresh_token:'refresh'});
  const options=Object.freeze({url:'https://resource.test',data:body,headers:Object.freeze({accept:'application/json'})});
  if(typeof body==='string'){assert.equal((await client.request(options)).data,'ok');assert.equal(requests,2);assert.equal(refreshes,1);}
  else {await assert.rejects(client.request(options),error=>error===denied);assert.equal(requests,1);assert.equal(refreshes,0);}
 }
});
test('a second authentication rejection is returned without an unbounded replay loop',async()=>{
 let requests=0,refreshes=0;const denied=Object.assign(new Error('denied'),{response:{status:403}});
 const client=new OAuth2Client({transporter:{request:async options=>{if(String(options.url).endsWith('/token')){refreshes++;return {data:{access_token:'fresh',expires_in:3600}};}requests++;throw denied;}}});
 client.setCredentials({access_token:'old',refresh_token:'refresh'});await assert.rejects(client.request({url:'https://resource.test'}),error=>error===denied);assert.equal(requests,2);assert.equal(refreshes,1);
});
test('concurrent identity requests share a provider exchange, including failure recovery',async()=>{
 let count=0;const gate=deferred(),client=new IdTokenClient({targetAudience:'fixture',idTokenProvider:{fetchIdToken:async()=>{count++;await gate.promise;return 'invalid';}}});
 const pending=Promise.allSettled(Array.from({length:8},()=>client.getRequestHeaders()));await tick();assert.equal(count,1);gate.resolve();assert((await pending).every(value=>value.status==='rejected'));
 const token='header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
 for(const exp of [Number.MAX_VALUE,0,-1,'123']){const invalid='header.'+Buffer.from(JSON.stringify({exp})).toString('base64url')+'.signature';client.idTokenProvider={fetchIdToken:async()=>invalid};await assert.rejects(client.getRequestHeaders(),/Invalid ID token expiry/);assert.equal(client.credentials.id_token,undefined);}
 client.idTokenProvider={fetchIdToken:async()=>token};assert.equal((await client.getRequestHeaders()).get('authorization'),'Bearer '+token);
});
test('ADC retries after an explicit malformed credential file is repaired',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-adc-test-')),file=path.join(directory,'credential.json');fs.writeFileSync(file,'bad');
 const auth=new GoogleAuth({keyFilename:file});try{await assert.rejects(auth.getClient());fs.writeFileSync(file,JSON.stringify({type:'authorized_user',client_id:'client',client_secret:'secret',refresh_token:'refresh'}));assert(await auth.getClient() instanceof UserRefreshClient);}finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('unsupported executable and federation providers fail explicitly without invoking suppliers',()=>{
 const auth=new GoogleAuth();for(const type of ['external_account','external_account_authorized_user','gdch_service_account'])assert.throws(()=>auth.fromJSON({type,credential_source:{executable:{command:'must-not-run'}}}),/outside.*contract/);
});
test('GoogleAuth fills late GAPIC defaults without overriding explicitly configured JWT values',async()=>{
 const key=crypto.generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({format:'pem',type:'pkcs8'}),auth=new GoogleAuth({credentials:{client_email:'fixture@example.test',private_key:key,type:'service_account'}});
 const client=await auth.getClient();client.defaultServicePath='explicit.test';auth.defaultServicePath='default.test';auth.defaultScopes=['scope'];auth.useJWTAccessWithScope=true;
 assert.equal(await auth.getClient(),client);assert.equal(client.defaultServicePath,'explicit.test');assert.deepEqual(client.defaultScopes,['scope']);assert.equal(client.useJWTAccessWithScope,true);
});
test('token exchange snapshots rotated claims and does not cache an older flight over a newer one',async()=>{
 const key=crypto.generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({format:'pem',type:'pkcs8'}),first=deferred(),second=deferred();let count=0;
 const options={iss:'fixture@example.test',key,additionalClaims:{tenant:'old'},transporter:{request:()=>++count===1?first.promise:second.promise}},handler=new TokenHandler(options);
 const a=handler.getToken(true);await tick();options.additionalClaims.tenant='new';const b=handler.getToken(true);await tick();
 second.resolve({data:{access_token:'new',expires_in:3600}});await b;first.resolve({data:{access_token:'old',expires_in:3600}});await a;assert.equal(handler.token.access_token,'new');
});
test('impersonation rejects malformed expiry and cross-universe credentials',async()=>{
 assert.throws(()=>new Impersonated({universeDomain:'other.example',sourceClient:{universeDomain:'googleapis.com'}}),/universe/);
 const client=new Impersonated({sourceClient:{getAccessToken:async()=>({token:'fixture'}),request:async()=>({data:{accessToken:'fixture',expireTime:'invalid'}})},targetPrincipal:'fixture@example.test'});
 await assert.rejects(client.getAccessToken(),/Invalid token expiry/);assert.equal(client.credentials.access_token,undefined);
});
test('public entry loads only independently implemented runtime files',()=>{
 const root=path.resolve(__dirname,'../lib')+path.sep;
 for(const file of Object.keys(require.cache).filter(file=>file.startsWith(root)))assert(file.includes(path.sep+'application'+path.sep)||file.endsWith('verify-token.js')||file.endsWith('signing-key.js'),file);
});
