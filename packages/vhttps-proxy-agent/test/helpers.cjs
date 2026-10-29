'use strict';
const http=require('node:http'),https=require('node:https'),net=require('node:net'),fs=require('node:fs');
const {once}=require('node:events');
const ssl={key:fs.readFileSync(__dirname+'/../../vagent-base/test/tls-key.pem'),cert:fs.readFileSync(__dirname+'/../../vagent-base/test/tls-cert.pem')};
async function start(t,server){
  const sockets=new Set();server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  if(t)t.after(()=>new Promise(resolve=>{for(const socket of sockets)socket.destroy();server.close(resolve);}));
  return server;
}
async function origin(t,secure=false,handler=(q,s)=>s.end('ok')){const server=await start(t,secure?https.createServer(ssl,handler):http.createServer(handler));return{server,url:(secure?'https':'http')+'://127.0.0.1:'+server.address().port};}
async function proxy(t,secure=false,handler){
  const upstreams=new Set(),requests=[];
  const server=(secure?https.createServer({...ssl,ALPNProtocols:['http/1.1']}):http.createServer());
  server.on('connect',handler||((request,socket,head)=>{
    requests.push(request);const url=new URL('http://'+request.url),up=net.connect(Number(url.port),url.hostname.replace(/^\[|\]$/g,''),()=>{
      socket.write('HTTP/1.1 200 Connection established\r\n\r\n');if(head.length)up.write(head);socket.pipe(up);up.pipe(socket);
    });upstreams.add(up);up.on('close',()=>upstreams.delete(up));up.on('error',()=>socket.destroy());socket.on('error',()=>up.destroy());socket.on('close',()=>up.destroy());
  }));
  await start(t,server);if(t)t.after(()=>{for(const s of upstreams)s.destroy();});
  return{server,requests,upstreams,url:(secure?'https':'http')+'://127.0.0.1:'+server.address().port};
}
function request(url,options){return new Promise((resolve,reject)=>{const q=(url.startsWith('https:')?https:http).get(url,options,response=>{const chunks=[];response.on('data',c=>chunks.push(c));response.on('error',reject);response.on('end',()=>resolve({status:response.statusCode,body:Buffer.concat(chunks).toString(),headers:response.headers}));});q.on('error',reject);});}
module.exports={ssl,start,origin,proxy,request};
