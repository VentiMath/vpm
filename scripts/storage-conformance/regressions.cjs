'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function run(){
 const variants={upstream:path.join(__dirname,'node_modules/@google-cloud/storage/build/cjs/src'),vpm:path.resolve(__dirname,'../../packages/vgoogle-cloud-storage/lib')};
 const start=new Date(Math.floor(Date.now()/1000)*1000),expires=+start+3600000;
 const config={method:'GET',version:'v4',expires,accessibleAt:start};
 const rows=[];
 for(const [name,dir]of Object.entries(variants)){
  const {URLSigner}=require(dir+'/signer.js'),{CRC32C}=require(dir+'/crc32c.js');let canonical;
  const auth={getCredentials:async()=>({client_email:'fixture@example.com'}),sign:async()=>Buffer.from('signature').toString('base64')};
  const signer=new URLSigner(auth,{name:'fixture'},{name:'f'},{apiEndpoint:'https://download.example:8443',universeDomain:'googleapis.com'});
  const original=signer.getCanonicalRequest;signer.getCanonicalRequest=function(...args){canonical=args;return original.apply(this,args);};
  let shortRejected=false;try{await signer.getSignedUrl({...config,extensionHeaders:{'x-goog-content-sha256':'a'.repeat(40)}});}catch(e){shortRejected=/hexadecimal/.test(e.message);}
  let queryRejected=false;try{await signer.getSignedUrl({...config,queryParams:{'X-Goog-Signature':'forged'}});}catch(e){queryRejected=/cannot override/.test(e.message);}
  await signer.getSignedUrl({...config,extensionHeaders:{'X-Goog-Meta-Note':'a\tb','x-goog-meta-note':'c',missing:undefined}});
  const canonicalHeaders=canonical[3],signedHeaders=canonical[4];
  let offsetCorrect=false;try{offsetCorrect=CRC32C.from(new Uint8Array([9,0x12,0x34,0x56,0x78,9]).subarray(1,5)).toString()==='EjRWeA==';}catch{}
  rows.push({name,shortRejected,queryRejected,offsetCorrect,portCorrect:canonicalHeaders.includes('host:download.example:8443\n'),headersCorrect:canonicalHeaders==='host:download.example:8443\nx-goog-meta-note:a b,c\n'&&signedHeaders==='host;x-goog-meta-note'});
 }
 for(const key of ['shortRejected','queryRejected','offsetCorrect','portCorrect','headersCorrect']){assert.equal(rows[0][key],false,key+' upstream control');assert.equal(rows[1][key],true,key+' VPM fix');}
 console.log('Five paired Storage regressions verified: digest length, signing-query overrides, offset CRC32C, signed host port and normalized header list.');
};if(require.main===module)module.exports().catch(e=>{console.error(e);process.exitCode=1;});
