'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{createRequire}=require('node:module');
const storagePackage=require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'),fixture=createRequire(storagePackage);
module.exports=function callers(lib=require('../../packages/vhtml-entities'),upstream=false){
 assert.equal(require(storagePackage).version,'8.4.0');assert.equal(fixture('html-entities/package.json').version,'2.6.0');
 const entry=fixture.resolve('html-entities'),previous=require(entry),prefix=path.dirname(storagePackage)+path.sep;
 const saved=new Map(Object.entries(require.cache).filter(([file])=>file.startsWith(prefix)));for(const [file]of saved)delete require.cache[file];
 let calls=0;require.cache[entry].exports={...lib,decode(...args){calls++;return lib.decode(...args);}};
 try{
  const {ApiError}=require(path.join(prefix,'build/cjs/src/nodejs-common/util.js'));
  const bodies=[['<p>Access &amp; permission denied</p>','<p>Access & permission denied</p>'],['Invalid &#x1f600; object','Invalid 😀 object'],['&NotEqualTilde; &copy;','≂̸ ©'],['missing &notit;','missing ¬it;'],['&amp;lt;script&amp;gt;','&lt;script&gt;'],['plain error','plain error']];
  for(const [encoded,expected]of bodies)for(const buffer of [false,true]){
   const body=buffer?Buffer.from(encoded):encoded,error={code:403,response:{body}};const failure=new ApiError(error);
   assert.equal(failure.message,expected);assert.equal(failure.code,403);assert.equal(failure.response,error.response);assert.equal(error.response.body,body);
  }
  const same=new ApiError({message:'A & B',response:{body:'A &amp; B'}});assert.equal(same.message,'A & B');
  const multi=new ApiError({message:'outer',response:{body:'inner &copy;'}});assert.match(multi.message,/1\. outer/);assert.match(multi.message,/2\. inner ©/);
  const before=calls;assert.equal(new ApiError({response:{body:'{"error":{"errors":[{"message":"JSON &amp; message"}]}}'}}).message,'JSON &amp; message');assert.equal(new ApiError('literal &amp;').message,'literal &amp;');assert.equal(calls,before);
  assert.equal(new ApiError({response:{body:'&#x10ffff;'}}).message,upstream?'�':String.fromCodePoint(0x10ffff));
  assert.equal(new ApiError({response:{body:'&#xd800;'}}).message,upstream?'\ud800':'�');
  assert.equal(calls,16);console.log('Storage 8.4.0 ApiError: 16 decoded bodies, bytes/Unicode, deduplication, combined errors and structured-message bypass passed.');
 }finally{require.cache[entry].exports=previous;for(const file of Object.keys(require.cache))if(file.startsWith(prefix))delete require.cache[file];for(const [file,module]of saved)require.cache[file]=module;}
};
if(require.main===module)module.exports(process.argv.includes('--upstream')?fixture('html-entities'):undefined,process.argv.includes('--upstream'));
