'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),https=require('node:https'),net=require('node:net'),fs=require('node:fs'),path=require('node:path');
const {once}=require('node:events');
module.exports=async function(from){
  const {HttpsProxyAgent}=from('https-proxy-agent');
  assert.equal(from('https-proxy-agent/package.json').version,'7.0.6');
  const fixture=path.resolve(__dirname,'../../packages/vagent-base/test');
  const tls={key:fs.readFileSync(path.join(fixture,'tls-key.pem')),cert:fs.readFileSync(path.join(fixture,'tls-cert.pem'))};
  const plain=http.createServer((q,s)=>s.end('plain '+q.url));
  const secure=https.createServer(tls,(q,s)=>s.end('secure '+q.url));
  const proxy=http.createServer();let tunnels=0;const sockets=new Set();
  proxy.on('connect',(request,socket,head)=>{
    tunnels++;const destination=new URL('http://'+request.url);
    const upstream=net.connect(Number(destination.port),destination.hostname,()=>{socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);});
    for(const stream of [socket,upstream]){sockets.add(stream);stream.on('close',()=>sockets.delete(stream));stream.on('error',()=>{socket.destroy();upstream.destroy();});}
  });
  let agent;
  try{
    for(const server of [plain,secure,proxy]){server.listen(0,'127.0.0.1');await once(server,'listening');}
    agent=new HttpsProxyAgent('http://127.0.0.1:'+proxy.address().port,{keepAlive:true,maxSockets:1});
    assert(agent instanceof require('../../packages/vagent-base').Agent);
    assert(agent instanceof require('../../packages/vhttps-proxy-agent').HttpsProxyAgent);
    async function request(server,scheme){return new Promise((resolve,reject)=>{(scheme==='https'?https:http).get(scheme+'://127.0.0.1:'+server.address().port+'/consumer',{agent,rejectUnauthorized:false},response=>{let body='';response.setEncoding('utf8');response.on('data',x=>body+=x);response.on('error',reject);response.on('end',()=>resolve(body));}).on('error',reject);});}
    for(const [server,scheme,expected]of [[plain,'http','plain'],[secure,'https','secure']]){
      for(let i=0;i<3;i++)assert.equal(await request(server,scheme),expected+' /consumer');
    }
    assert.equal(tunnels,2,'one reusable tunnel per HTTP/TLS origin');
    const response=await require('../../packages/vgaxios').request({url:'http://127.0.0.1:'+plain.address().port+'/gaxios',agent,retry:false,proxy:false});
    assert.equal(response.data,'plain /gaxios');
    assert.equal(tunnels,2);
  }finally{
    agent?.destroy();for(const socket of sockets)socket.destroy();
    for(const server of [plain,secure,proxy]){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  }
};
