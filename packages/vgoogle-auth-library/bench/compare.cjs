'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const upstream=require('../../../scripts/google-http-conformance/node_modules/google-auth11'),vpm=require('..');
const jws=require('vjws');
const root=path.resolve(__dirname,'..');
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const key=pair.privateKey.export({format:'pem',type:'pkcs8'});
const cert=pair.publicKey.export({format:'pem',type:'spki'});
const now=Math.floor(Date.now()/1000),payload={iat:now-10,exp:now+1800,sub:'subject',aud:'client',iss:'https://accounts.google.com'};
const signed=jws.sign({header:{alg:'RS256',kid:'key'},payload,secret:pair.privateKey});
const cases=[
 {name:'OAuth2 client creation',async:false,make:lib=>()=>new lib.OAuth2Client({clientId:'client'}),validate:v=>assert.equal(v._clientId,'client')},
 {name:'cached self-signed JWT headers',async:false,make:lib=>{const client=new lib.JWTAccess('service@example.test',key,'key');client.getRequestHeaders('https://api.test');return()=>client.getRequestHeaders('https://api.test');},validate:v=>assert(v.get('authorization').startsWith('Bearer '))},
 {name:'self-signed JWT for new audiences',async:false,make:lib=>{const client=new lib.JWTAccess('service@example.test',key,'key');let n=0;return()=>client.getRequestHeaders('https://api.test/'+n++);},validate:v=>assert(jws.verify(v.get('authorization').slice(7),'RS256',pair.publicKey))},
 {name:'cached OAuth2 request headers',async:true,make:lib=>{const client=new lib.OAuth2Client();client.setCredentials({access_token:'token',expiry_date:Date.now()+3600000});return()=>client.getRequestHeaders();},validate:v=>assert.equal(v.get('authorization'),'Bearer token')},
 {name:'cached GoogleAuth project lookup',async:true,make:lib=>{const client=new lib.GoogleAuth({projectId:'project'});return()=>client.getProjectId();},validate:v=>assert.equal(v,'project')},
 {name:'forced JWT token exchange with stub transport',async:true,make:lib=>{const client=new lib.GoogleToken({key,iss:'service@example.test',scope:'scope',transporter:{request:async()=>({data:{access_token:'token',expires_in:3600}})}});return()=>client.getToken({forceRefresh:true});},validate:v=>assert.equal(v.access_token,'token')},
 {name:'RSA ID-token verification',async:true,make:lib=>{const client=new lib.OAuth2Client();const certs={key:cert};return()=>client.verifySignedJwtWithCertsAsync(signed,certs,'client',['https://accounts.google.com']);},validate:v=>assert.equal(v.getUserId(),'subject')},
];
const env={...process.env};for(const k of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy','GOOGLE_SDK_NODE_LOGGING'])delete process.env[k];
let server;const clients=[];
(async()=>{
 server=http.createServer((req,res)=>{assert.equal(req.headers.authorization,'Bearer token');res.setHeader('content-type','application/json');res.end('{"ok":true}');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 cases.push({name:'authenticated HTTP JSON request',async:true,make:lib=>{const client=new lib.OAuth2Client();clients.push(client);client.setCredentials({access_token:'token',expiry_date:Date.now()+3600000});return()=>client.request({url,proxy:false});},validate:v=>assert.equal(v.data.ok,true)});
 const runtimeFiles=fs.readdirSync(path.join(root,'lib'),{recursive:true}).filter(f=>/\.(js|cjs)$/.test(f)).map(f=>'lib/'+f);
 await require('../../../scripts/bench-paired.cjs').run({root,upstream,vpm,cases,files:[...runtimeFiles,'index.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/google-http-conformance/package-lock.json',...['vgaxios','vgcp-metadata','vjws','vjwa','vgoogle-logging-utils'].flatMap(name=>{const dir=path.join(root,'..',name);return fs.readdirSync(dir,{recursive:true}).filter(f=>!f.startsWith('node_modules/')&&!f.startsWith('test/')&&!f.startsWith('bench/')&&/\.(js|cjs)$/.test(f)).map(f=>'../'+name+'/'+f);})],cleanup:async()=>{for(const c of clients)c.transporter.destroy?.();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));Object.assign(process.env,env);}});
})().catch(error=>{server?.close();console.error(error);process.exitCode=1;});
