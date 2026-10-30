'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),{generateKeyPairSync,createHash,verify}=require('node:crypto');
const vpm=require('..'),upstream=require('../../../scripts/storage-conformance/node_modules/@google-cloud/storage');
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const credentials={client_email:'fixture@example.iam.gserviceaccount.com',private_key:privateKey},start=new Date(Math.floor(Date.now()/1000)*1000),expires=new Date(+start+3600000);
const encode=s=>encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const clients=new Map();
function client(lib){if(!clients.has(lib))clients.set(lib,new lib.Storage({projectId:'fixture-project',credentials}));return clients.get(lib);}
function checkV4(signed,headers){const u=new URL(signed),signature=u.searchParams.get('X-Goog-Signature');u.searchParams.delete('X-Goog-Signature');
 const query=[...u.searchParams].map(([k,v])=>[encode(k),encode(v)]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0).map(p=>p.join('=')).join('&');
 const names=Object.keys(headers).sort(),canonical=['GET',u.pathname,query,names.map(k=>k+':'+headers[k]+'\n').join(''),names.join(';'),headers['x-goog-content-sha256']||'UNSIGNED-PAYLOAD'].join('\n');
 const scope=u.searchParams.get('X-Goog-Credential').split('/').slice(1).join('/'),text=['GOOG4-RSA-SHA256',u.searchParams.get('X-Goog-Date'),scope,createHash('sha256').update(canonical).digest('hex')].join('\n');
 assert.equal(verify('RSA-SHA256',Buffer.from(text),publicKey,Buffer.from(signature,'hex')),true);return u;
}
test('ordinary V2/V4 signatures match upstream exactly and verify cryptographically',async()=>{
 for(const version of ['v2','v4']){
  const cfg={action:'read',version,expires,accessibleAt:start},name='nested/café #1.pdf';
  const [a]=await client(vpm).bucket('fixture').file(name).getSignedUrl(cfg),[b]=await client(upstream).bucket('fixture').file(name).getSignedUrl(cfg);assert.equal(a,b);
  if(version==='v4')checkV4(a,{host:'storage.googleapis.com'});else{const u=new URL(a),text=['GET','','',u.searchParams.get('Expires'),u.pathname].join('\n');assert(verify('RSA-SHA256',Buffer.from(text),publicKey,Buffer.from(u.searchParams.get('Signature'),'base64')));}
 }
});
test('V4 canonical headers combine case variants, skip undefined, collapse single tabs and keep ports',async()=>{
 const headers=Object.freeze({'X-Goog-Meta-Note':Object.freeze([' a\tb ',' c ']),'x-goog-meta-note':' d ',unused:undefined});
 const cfg=Object.freeze({action:'read',version:'v4',expires,accessibleAt:start,host:'https://download.example:8443',extensionHeaders:headers});
 const [signed]=await client(vpm).bucket('fixture').file('item').getSignedUrl(cfg);
 checkV4(signed,{host:'download.example:8443','x-goog-meta-note':'a b,c,d'});assert.equal(headers['x-goog-meta-note'],' d ');
 const old=(await client(upstream).bucket('fixture').file('item').getSignedUrl(cfg))[0];assert.throws(()=>checkV4(old,{host:'download.example:8443','x-goog-meta-note':'a b,c,d'}),assert.AssertionError);
});
test('SHA256 requires exactly 64 hex digits, including mixed-case header names',async()=>{
 const file=client(vpm).bucket('fixture').file('item');
 for(const hash of ['a'.repeat(40),'a'.repeat(63),'a'.repeat(65),'x'+'a'.repeat(64),'',123])await assert.rejects(()=>file.getSignedUrl({action:'read',version:'v4',expires,accessibleAt:start,extensionHeaders:{'X-Goog-Content-SHA256':hash}}),/hexadecimal/);
 const digest='a'.repeat(64),[url]=await file.getSignedUrl({action:'read',version:'v4',expires,accessibleAt:start,extensionHeaders:{'X-Goog-Content-SHA256':digest}});checkV4(url,{host:'storage.googleapis.com','x-goog-content-sha256':digest});
});
test('caller query parameters cannot overwrite either signing version’s authentication fields',async()=>{
 for(const version of ['v2','v4'])for(const name of ['GoogleAccessId','Expires','Signature','X-Goog-Algorithm','X-Goog-Credential','X-Goog-Date','X-Goog-Expires','X-Goog-SignedHeaders','X-Goog-Signature','x-goog-signature'])await assert.rejects(()=>client(vpm).bucket('fixture').file('f').getSignedUrl({action:'read',version,expires,accessibleAt:start,queryParams:{[name]:'override'}}),/cannot override/);
 const cfg={action:'read',version:'v4',expires,accessibleAt:start,queryParams:{'response-content-type':'application/pdf','response-content-disposition':'inline; filename="file.pdf"'}};
 const [url]=await client(vpm).bucket('fixture').file('f').getSignedUrl(cfg);checkV4(url,{host:'storage.googleapis.com'});
});
test('invalid actions and header values settle promise and callback APIs',async()=>{
 const file=client(vpm).bucket('fixture').file('f');
 for(const action of ['bogus','__proto__','toString'])await assert.rejects(()=>file.getSignedUrl({action,expires}),/Invalid signed URL action/);
 for(const extensionHeaders of [{'bad name':'x'},{'x-goog-meta':'a\nb'},{'x-goog-meta':{toString(){throw new Error('coercion');}}}]){
  await assert.rejects(()=>file.getSignedUrl({action:'read',expires,extensionHeaders}),/Invalid signing header/);
  await new Promise((resolve,reject)=>{let called=0;file.getSignedUrl({action:'read',expires,extensionHeaders},err=>{try{assert.equal(++called,1);assert.match(err.message,/Invalid signing header/);resolve();}catch(e){reject(e);}});});
 }
});
test('custom signer snapshots records before asynchronous credential lookup',async()=>{
 const {URLSigner}=require('../lib/signer');let resume;const auth={getCredentials:()=>new Promise(r=>{resume=r;}),sign:async()=>Buffer.from('signature').toString('base64')};
 const signer=new URLSigner(auth,{name:'fixture'},{name:'f'},{apiEndpoint:'https://storage.googleapis.com',universeDomain:'googleapis.com'});
 const queryParams={key:'before'},extensionHeaders={'x-goog-meta':'before'},pending=signer.getSignedUrl({method:'GET',version:'v4',expires,accessibleAt:start,queryParams,extensionHeaders});queryParams.key='after';extensionHeaders['x-goog-meta']='after';resume(credentials);const url=await pending;assert.equal(new URL(url).searchParams.get('key'),'before');
});
test('CRC32C initialization respects ArrayBufferView offsets and lengths',()=>{
 const bytes=new Uint8Array([99,99,0x12,0x34,0x56,0x78,99]);
 for(const view of [bytes.subarray(2,6),new DataView(bytes.buffer,2,4)])assert.equal(vpm.CRC32C.from(view).toString(),'EjRWeA==');
 assert.throws(()=>upstream.CRC32C.from(bytes.subarray(2,6)),RangeError);assert.throws(()=>vpm.CRC32C.from(bytes.subarray(0,3)),RangeError);
});
test('native ESM exports share CJS classes without inherited export pollution',async()=>{
 const esm=await import('../index.mjs');for(const key of Object.keys(vpm))assert.equal(esm[key],vpm[key],key);
 const {spawnSync}=require('node:child_process');const result=spawnSync(process.execPath,['-e',`Object.prototype.inheritedExport='polluted';const v=require(${JSON.stringify(require.resolve('..'))});if(Object.hasOwn(v,'inheritedExport'))throw new Error('Inherited export');delete Object.prototype.inheritedExport;`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
test('all production dependencies stay inside VPM',()=>{const pkg=require('../package.json');assert.equal(Object.keys(pkg.dependencies).length,13);assert(Object.keys(pkg.dependencies).every(n=>n.startsWith('v')));assert.equal(pkg.dependencies['abort-controller'],undefined);});
