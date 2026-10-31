'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{PassThrough}=require('node:stream');
const retry=require('..');
test('gRPC-style status after readable end releases the buffered body without retrying',async()=>{
 let calls=0;
 const output=retry(null,{objectMode:true,responseAfterEnd:true,request(){calls++;const stream=new PassThrough({objectMode:true});stream.end({value:42});stream.once('end',()=>setTimeout(()=>stream.emit('response',{statusCode:200}),10));return stream;}});
 const values=[];for await(const value of output)values.push(value);assert.deepEqual(values,[{value:42}]);assert.equal(calls,1);
});
test('aborting while waiting for delayed status detaches the transport',async()=>{
 const source=new PassThrough({objectMode:true});const output=retry(null,{objectMode:true,responseAfterEnd:true,request:()=>source});output.resume();source.end();
 await new Promise(resolve=>source.once('end',resolve));const closed=new Promise(resolve=>output.once('close',resolve));output.abort();await closed;
 assert.equal(source.listenerCount('response'),0);source.emit('response',{statusCode:200});assert.equal(output.destroyed,true);
});
test('responseAfterEnd requires an explicit boolean',()=>{assert.throws(()=>retry(null,{request:()=>new PassThrough(),responseAfterEnd:1}),/responseAfterEnd/);});
