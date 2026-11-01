'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{finished,pipeline}=require('node:stream/promises'),{Readable,Writable}=require('node:stream');
const Own=require('../lib/hash-stream-validator').HashStreamValidator;
const Original=require('../../../scripts/storage-conformance/node_modules/@google-cloud/storage/build/cjs/src/hash-stream-validator').HashStreamValidator;
const {CRC32C}=require('../lib/crc32c');
const bytes=Buffer.from('checksum fixture'),md5=createHash('md5').update(bytes).digest('base64'),crc=new CRC32C();crc.update(bytes);const crc32c=crc.toString();
async function consume(Impl,options,chunks=[bytes]){const stream=new Impl(options);stream.resume();const done=finished(stream);for(const chunk of chunks)stream.write(chunk);stream.end();await done;return stream;}
test('ordinary streams, empty input, expected hashes and checksum buffers agree with 8.4.0',async()=>{
 for(const Impl of [Own,Original]) {
  for(const options of [{},{crc32c:true,crc32cExpected:crc32c},{md5:true,md5Expected:md5},{crc32c:true,md5:true,crc32cExpected:crc32c,md5Expected:md5},{crc32c:true,md5:true,updateHashesOnly:true}]){
   const stream=await consume(Impl,options,[bytes.subarray(0,3),bytes.subarray(3)]);
   if(options.md5){assert.equal(stream.md5Digest,md5);assert.equal(stream.test('md5',Buffer.from(md5,'base64')),true);}
   if(options.crc32c){assert.equal(stream.crc32c,crc32c);assert.equal(stream.test('crc32c',Buffer.from(crc32c,'base64')),true);}
   assert.equal(stream.test('unknown',''),false);
  }
  const empty=await consume(Impl,{md5:true,crc32c:true,updateHashesOnly:true},[]);assert.equal(empty.md5Digest,'1B2M2Y8AsgTpgAmY7PhCfg==');assert.equal(empty.crc32c,'AAAAAA==');
  for(const options of [{md5:true},{crc32c:true},{md5:true,md5Expected:'bad'},{crc32c:true,crc32cExpected:'bad'}])await assert.rejects(consume(Impl,options),{code:'CONTENT_DOWNLOAD_MISMATCH'});
 }
});
test('digest snapshots do not finalize or cache an incomplete MD5',async()=>{
 for(const Impl of [Original,Own]){
  const stream=new Impl({md5:true,updateHashesOnly:true});stream.resume();const done=finished(stream);
  stream.write(Buffer.from('a'));assert.equal(stream.md5Digest,createHash('md5').update('a').digest('base64'));assert.equal(stream.md5Digest,stream.md5Digest);
  stream.end(Buffer.from('b'));
  if(Impl===Original)await assert.rejects(done,{code:'ERR_CRYPTO_HASH_FINALIZED'});
  else {await done;assert.equal(stream.md5Digest,createHash('md5').update('ab').digest('base64'));assert.equal(stream.test('md5',stream.md5Digest),true);}
 }
});
test('all enabled checksums must match: MD5 success cannot mask CRC failure',async()=>{
 const options={crc32c:true,md5:true,crc32cExpected:'AAAAAA==',md5Expected:md5};
 await consume(Original,options);await assert.rejects(consume(Own,options),{code:'CONTENT_DOWNLOAD_MISMATCH'});
 await assert.rejects(consume(Own,{...options,crc32cExpected:undefined}),{code:'CONTENT_DOWNLOAD_MISMATCH'});
});
test('checksum input is captured before a downstream listener can mutate it',async()=>{
 for(const Impl of [Original,Own]){
  const chunk=Buffer.from(bytes),stream=new Impl({md5:true,updateHashesOnly:true});
  stream.on('data',data=>{assert.equal(data,chunk);data.fill(0);});const done=finished(stream);stream.end(chunk);await done;
  assert.equal(stream.md5Digest===md5,Impl===Own);
 }
});
test('custom CRC ownership, seeded continuation and validator failures',async()=>{
 const custom=new CRC32C();custom.update(bytes.subarray(0,3));let generated=0;
 const stream=await consume(Own,{crc32c:true,crc32cInstance:custom,crc32cGenerator(){generated++;},crc32cExpected:crc32c},[bytes.subarray(3)]);assert.equal(stream.crc32c,crc32c);assert.equal(generated,0);
 const boom=new Error('custom update');let exposed=false;const bad=new Own({crc32c:true,crc32cInstance:{update(){throw boom;}}});bad.on('data',()=>exposed=true);const done=finished(bad);bad.end(bytes);await assert.rejects(done,error=>error===boom);assert.equal(exposed,false);
 await assert.rejects(consume(Own,{crc32c:true,crc32cExpected:'x',crc32cInstance:{update(){},validate(){throw boom;}}}),error=>error===boom);
});
test('real pipeline preserves backpressure and final checksums over many chunks',async()=>{
 const chunks=Array.from({length:128},()=>Buffer.alloc(2048,97)),expected=createHash('md5');for(const chunk of chunks)expected.update(chunk);
 const stream=new Own({md5:true,crc32c:true,updateHashesOnly:true});let count=0;
 await pipeline(Readable.from(chunks),stream,new Writable({highWaterMark:1,write(chunk,encoding,callback){count+=chunk.length;setImmediate(callback);}}));assert.equal(count,262144);assert.equal(stream.md5Digest,expected.digest('base64'));
});
