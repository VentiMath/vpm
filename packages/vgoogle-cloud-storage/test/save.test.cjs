'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{Writable,Readable}=require('node:stream');
const {Storage}=require('..'),original=require('../../../scripts/storage-conformance/node_modules/@google-cloud/storage');
const {uploadPolicy}=require('../lib/save.js');
function fileFor(API,options={}){return new API.Storage({projectId:'fixture',retryOptions:{autoRetry:true,idempotencyStrategy:0,maxRetries:0,retryDelayMultiplier:1,maxRetryDelay:1,totalTimeout:10,...options}}).bucket('fixture').file('doc.pdf');}
function sink(onWrite=()=>{}){return new Writable({write(chunk,encoding,callback){onWrite(chunk);callback();}});}

test('save does not change shared retries (original fault reproduced)',async()=>{
 for(const [API,expected] of [[original,false],[{Storage},true]]){
  const file=fileFor(API,{idempotencyStrategy:1});file.createWriteStream=()=>sink();await file.save('x');assert.equal(file.storage.retryOptions.autoRetry,expected);
 }
});
test('save snapshots bytes and metadata before asynchronous writing',async()=>{
 for(const [API,expected] of [[original,'Zbc'],[{Storage},'abc']]){
  const file=fileFor(API),data=Buffer.from('abc'),options={metadata:{metadata:{label:'before'}},contentType:'text/plain'};let captured,bytes;
  file.createWriteStream=opts=>{captured=opts;return new Writable({write(chunk,encoding,callback){setImmediate(()=>{bytes=chunk.toString();callback();});}});};
  const result=file.save(data,options);data[0]=90;options.metadata.metadata.label='after';await result;assert.equal(bytes,expected);assert.equal(captured.metadata.metadata.label,API===original?'after':'before');
 }
});
test('invalid contexts call back once and never start an upload (original fault reproduced)',async()=>{
 for(const [API,expected] of [[original,{calls:2,uploads:1}],[{Storage},{calls:1,uploads:0}]]){
  const file=fileFor(API);let calls=0,uploads=0;file.createWriteStream=()=>{uploads++;return sink();};await file.save('x',{metadata:{contexts:{custom:{'bad"key':{value:'x'}}}}},()=>calls++);assert.deepEqual({calls,uploads},expected);
 }
});
test('retry budget and payload are owned by each save attempt',async()=>{
 const file=fileFor({Storage},{maxRetries:1});let attempts=0;const options={metadata:{metadata:{label:'before'}}};
 file.createWriteStream=opts=>{attempts++;assert.equal(opts.metadata.metadata.label,'before');opts.metadata.metadata.label='changed';return new Writable({write(chunk,encoding,callback){callback(attempts===1?Object.assign(new Error('retry'),{code:503}):undefined);}});};
 await file.save('data',options);assert.equal(attempts,2);assert.equal(options.metadata.metadata.label,'before');assert.equal(file.storage.retryOptions.autoRetry,true);
});
test('one-shot streams are not replayed; source factories can retry',async()=>{
 for(const factory of [false,true]){
  const file=fileFor({Storage},{maxRetries:1});let attempts=0;file.createWriteStream=()=>{attempts++;return new Writable({write(c,e,cb){cb(attempts===1?Object.assign(new Error('retry'),{code:503}):undefined);}});};
  const source=factory?async function*(){yield Buffer.from('hello');}:Readable.from(['hello']);const op=file.save(source);
  if(factory){await op;assert.equal(attempts,2);}else{await assert.rejects(op,/retry/);assert.equal(attempts,1);}
 }
});
test('progress, callbacks, null options and premature closes settle correctly',async()=>{
 const file=fileFor({Storage});let progress=0,calls=0;
 file.createWriteStream=()=>new Writable({write(c,e,cb){this.emit('progress',{bytesWritten:c.length});cb();}});
 await file.save('abc',{onUploadProgress:e=>progress=e.bytesWritten},error=>{assert.equal(error,undefined);calls++;});assert.equal(progress,3);assert.equal(calls,1);await file.save('x',null);
 file.createWriteStream=()=>new Writable({write(){this.destroy();}});await assert.rejects(file.save('x'),{code:'ERR_STREAM_PREMATURE_CLOSE'});
});
test('non-idempotent resumable upload receives a local retry policy',async()=>{
 const file=fileFor({Storage},{idempotencyStrategy:1,maxRetries:3});let selected;
 file.createWriteStream=options=>{selected=options[uploadPolicy];return sink();};await file.save('x');assert.equal(selected.autoRetry,false);assert.equal(selected.maxRetries,0);assert.equal(file.storage.retryOptions.autoRetry,true);
});
