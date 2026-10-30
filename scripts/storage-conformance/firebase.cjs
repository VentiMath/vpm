'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module'),{generateKeyPairSync,verify}=require('node:crypto');
module.exports=async function run(upstream=false){
 const fixture=createRequire(require.resolve('../consumers/node_modules/firebase-admin/package.json')),entry=fixture.resolve('@google-cloud/storage'),original=require(entry);
 const target=upstream?require('./node_modules/@google-cloud/storage'):require('../../packages/vgoogle-cloud-storage');
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
 const {initializeApp,cert,deleteApp}=fixture('firebase-admin/app'),{getStorage}=fixture('firebase-admin/storage');let app;
 try{
  require.cache[entry].exports=target;
  app=initializeApp({projectId:'fixture-project',storageBucket:'fixture-bucket',credential:cert({projectId:'fixture-project',clientEmail:'fixture@example.iam.gserviceaccount.com',privateKey})},'vpm-storage-'+(upstream?'upstream':'vpm'));
  const bucket=getStorage(app).bucket();assert(bucket instanceof target.Bucket);assert.equal(bucket.name,'fixture-bucket');
  const [signed]=await bucket.file('documents/café.pdf').getSignedUrl({action:'read',expires:Date.now()+3600000});const url=new URL(signed);
  const canonical=['GET','','',url.searchParams.get('Expires'),url.pathname].join('\n');assert(verify('RSA-SHA256',Buffer.from(canonical),publicKey,Buffer.from(url.searchParams.get('Signature'),'base64')));
  assert.equal(getStorage(app).bucket('other').name,'other');console.log(`${upstream?'Upstream':'VPM'} Storage through Firebase Admin 12.7.0: actual bucket factory, service-account credential handoff and verified signed URL.`);
 }finally{require.cache[entry].exports=original;if(app)await deleteApp(app);}
};if(require.main===module)module.exports(process.argv.includes('--upstream')).catch(e=>{console.error(e);process.exitCode=1;});
