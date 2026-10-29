'use strict';
const http=require('node:http');
const https=require('node:https');
const {TextDecoder}=require('node:util');
const decoder=new TextDecoder('utf-8',{fatal:true});
async function toBuffer(stream,options={}) {
  const limit=options.limit ?? Infinity;
  if(limit!==Infinity && (!Number.isSafeInteger(limit)||limit<0))throw new RangeError('limit must be a nonnegative safe integer or Infinity');
  let buffer,length=0;
  for await(const chunk of stream){
    const string=typeof chunk==='string';
    if(!string&&!ArrayBuffer.isView(chunk))throw new TypeError('Response chunks must be strings or byte views');
    const size=string?Buffer.byteLength(chunk):chunk.byteLength;
    if(length+size>limit)throw new RangeError('Response exceeded byte limit');
    const bytes=string?null:Buffer.isBuffer(chunk)?chunk:new Uint8Array(chunk.buffer,chunk.byteOffset,chunk.byteLength);
    if(!buffer){buffer=string?Buffer.from(chunk):Buffer.from(bytes);length=size;continue;}
    if(length+size>buffer.length){
      const capacity=Math.min(limit,Math.max(length+size,buffer.length*2,4096));
      const grown=Buffer.allocUnsafe(capacity);grown.set(buffer.subarray(0,length));buffer=grown;
    }
    if(string)buffer.write(chunk,length,size);else buffer.set(bytes,length);
    length+=size;
  }
  return buffer ? (length===buffer.length?buffer:buffer.subarray(0,length)) : Buffer.alloc(0);
}
async function json(stream,options) {
  const buffer=await toBuffer(stream,options);
  try{return JSON.parse(decoder.decode(buffer));}
  catch{throw new SyntaxError('Response must be valid UTF-8 JSON');}
}
function req(url,options={}) {
  const parsed=new URL(typeof url==='string'?url:url.href);
  if(parsed.protocol!=='http:'&&parsed.protocol!=='https:')throw new TypeError('Request URL must use HTTP or HTTPS');
  const request=(parsed.protocol==='https:'?https:http).request(parsed,options);
  const promise=new Promise((resolve,reject)=>{
    let settled=false;
    const cleanup=()=>{request.removeListener('response',response);request.removeListener('error',failure);request.removeListener('close',close);};
    const response=value=>{settled=true;request.removeListener('response',response);resolve(value);};
    const failure=error=>{cleanup();if(!settled){settled=true;reject(error);}};
    const close=()=>{if(settled)cleanup();else failure(Object.assign(new Error('Request closed before receiving a response'),{code:'ECONNRESET'}));};
    request.once('response',response);request.once('error',failure);request.once('close',close);
  });
  request.then=promise.then.bind(promise);
  request.end();return request;
}
module.exports={toBuffer,json,req};
