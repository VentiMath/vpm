'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const variant=process.argv[2];
if(!variant){const outputs=[];for(const kind of ['upstream','vpm']){const r=spawnSync(process.execPath,[__filename,kind],{encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr);outputs.push(JSON.parse(r.stdout));}assert.deepEqual(outputs[0],outputs[1]);console.log('App Check: signed-token policy, real JWKS and authenticated replay-protection HTTP match; option ownership and malformed responses checked.');}
else main().catch(error=>{console.error(error);process.exitCode=1});
async function main(){
 const vpm=variant==='vpm',root=path.resolve(__dirname,vpm?'../../packages/vfirebase-admin':'node_modules/firebase-admin');
 const key=require('./upstream/test/resources/mock.key.json').private_key,jwk={...crypto.createPublicKey(key).export({format:'jwk'}),kid:'fixture',alg:'RS256',use:'sig'},sign=require('jsonwebtoken').sign;
 const requests=[];let reply={alreadyConsumed:false},status=200;
 const server=http.createServer(async(req,res)=>{res.setHeader('content-type','application/json');if(req.url==='/jwks'){res.setHeader('cache-control','max-age=60');res.end(JSON.stringify({keys:[jwk]}));return;}const parts=[];for await(const chunk of req)parts.push(chunk);res.statusCode=status;requests.push({method:req.method,path:req.url,authorization:req.headers.authorization,body:JSON.parse(Buffer.concat(parts))});res.end(JSON.stringify(reply));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 const {initializeApp,deleteApp}=require(root+'/lib/app'),{getAppCheck}=require(root+'/lib/app-check'),{PublicKeySignatureVerifier}=require(root+'/lib/utils/jwt');
 const app=initializeApp({projectId:'fixture',credential:{getAccessToken:async()=>({access_token:'test-token',expires_in:3600})}},'app-check'),service=getAppCheck(app);
 const now=Math.floor(Date.now()/1000),claims={iss:'https://firebaseappcheck.googleapis.com/123',aud:['projects/fixture'],sub:'application',iat:now-30,exp:now+600};
 const token=values=>sign(values,key,{algorithm:'RS256',keyid:'fixture'});
 service.appCheckTokenVerifier.signatureVerifier=PublicKeySignatureVerifier.withJwksUrl(url+'/jwks');service.client.getVerifyTokenUrl=async()=>url+'/consume';
 const outcome=async(fn)=>{try{return await fn();}catch(e){return {error:e.code};}};
 try{
  const valid=token(claims),normal=[];
  for(const options of [undefined,{}, {consume:false},{consume:true}]){const result=await service.verifyToken(valid,options);assert.equal(result.appId,'application');assert.equal(result.token.app_id,'application');normal.push({appId:result.appId,alreadyConsumed:result.alreadyConsumed});}
  reply={alreadyConsumed:true};normal.push((await service.verifyToken(valid,{consume:true})).alreadyConsumed);
  reply={};normal.push((await service.verifyToken(valid,{consume:true})).alreadyConsumed);
  for(const overrides of [{aud:['projects/other']},{iss:'https://invalid.example/'},{sub:''},{exp:now-10},{sub:123}])normal.push(await outcome(()=>service.verifyToken(token({...claims,...overrides}))));
  normal.push(await outcome(()=>service.verifyToken(valid.slice(0,-12)+'abcdefghijkL')));
  const noSubject={...claims};delete noSubject.sub;normal.push(await outcome(()=>service.verifyToken(token(noSubject))));
  for(const row of requests){assert.equal(row.authorization,'Bearer test-token');assert.equal(row.body.app_check_token,valid);assert.equal(row.method,'POST');}
  reply={alreadyConsumed:'yes'};normal.push(await outcome(()=>service.verifyToken(valid,{consume:true})));
  // A caller cannot change consume after verification has started.
  let release;service.appCheckTokenVerifier.verifyToken=()=>new Promise(resolve=>{release=resolve});
  const options={consume:true},pending=service.verifyToken(valid,options);options.consume=false;reply={alreadyConsumed:true};release({...claims,app_id:'application'});
  assert.equal((await pending).alreadyConsumed,vpm?true:undefined);
  service.appCheckTokenVerifier.verifyToken=async()=>({...claims,app_id:'application'});
  for(const value of [null,[],false]){reply=value;const result=await outcome(()=>service.verifyToken(valid,{consume:true}));if(vpm)assert.equal(result.error,'app-check/invalid-argument');}
  if(vpm){status=403;reply={error:{status:'__proto__',message:'bad'}};assert.equal((await outcome(()=>service.verifyToken(valid,{consume:true}))).error,'app-check/unknown-error');}
  for(const value of [null,[],42])assert.throws(()=>service.verifyToken(valid,value),{code:'app-check/invalid-argument'});
  process.stdout.write(JSON.stringify(normal));
 }finally{await deleteApp(app);await new Promise(resolve=>server.close(resolve));}
}
