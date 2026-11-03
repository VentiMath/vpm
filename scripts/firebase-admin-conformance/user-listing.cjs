'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),http=require('node:http'),{spawnSync}=require('node:child_process');
const variant=process.argv[2];
if(!variant){const outputs=[];for(const kind of ['upstream','vpm']){const r=spawnSync(process.execPath,[__filename,kind],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);outputs.push(JSON.parse(r.stdout));}assert.deepEqual(outputs[0],outputs[1]);console.log('User listing: real GET pagination, encoded page token, records and terminal page match; integer limits and malformed replies checked.');}
else main().catch(error=>{console.error(error);process.exitCode=1});
async function main(){
 const vpm=variant==='vpm',root=path.resolve(__dirname,vpm?'../../packages/vfirebase-admin':'node_modules/firebase-admin'),calls=[];
 let body={users:[{localId:'one',email:'one@example.com'}],nextPageToken:'next/&?=page'};
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://fixture');calls.push({method:req.method,path:url.pathname,query:[...url.searchParams],authorization:req.headers.authorization});res.setHeader('content-type','application/json');res.end(JSON.stringify(body));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:'+server.address().port;
 const {initializeApp,deleteApp}=require(root+'/lib/app'),{getAuth}=require(root+'/lib/auth'),app=initializeApp({projectId:'fixture'}),auth=getAuth(app);
 try{
  const page=await auth.listUsers(1000);assert.equal(page.users[0].uid,'one');assert.equal(page.pageToken,'next/&?=page');body={};const last=await auth.listUsers(1000,page.pageToken);assert.deepEqual(last,{users:[]});const normal=calls.slice();
  for(const count of [0,-1,1001,Infinity,NaN,'1000'])await assert.rejects(auth.listUsers(count),{code:'auth/argument-error'});
  for(const token of [null,'',42])await assert.rejects(auth.listUsers(10,token),{code:'auth/invalid-page-token'});
  if(vpm){await assert.rejects(auth.listUsers(1.5),{code:'auth/argument-error'});body={users:{bad:true}};await assert.rejects(auth.listUsers(),{code:'auth/internal-error'});}
  else await auth.listUsers(1.5);
  process.stdout.write(JSON.stringify(normal));
 }finally{await deleteApp(app);await new Promise(resolve=>server.close(resolve));}
}
