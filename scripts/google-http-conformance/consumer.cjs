'use strict';
const http=require('node:http'),assert=require('node:assert/strict'),{Readable}=require('node:stream');
module.exports=async function(from){
 const {teenyRequest}=from('teeny-request');
 const server=http.createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({type:req.headers['content-type'],body}));});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const uri='http://127.0.0.1:'+server.address().port;
  const result=await new Promise((resolve,reject)=>teenyRequest({uri,method:'POST',headers:{},multipart:[{'Content-Type':'application/json',body:'{"metadata":true}'},{'Content-Type':'text/plain',body:Readable.from(['payload'])}]},(error,response,body)=>error?reject(error):resolve(body)));
  const boundary=result.type.split('boundary=')[1];assert.match(boundary,/^[a-f0-9-]{36}$/);assert(result.body.includes(boundary));assert(result.body.includes('payload'));assert(result.body.includes('"metadata":true'));
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
};
