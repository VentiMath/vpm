'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const upstream=require('../../../scripts/grpc-conformance/node_modules/@grpc/grpc-js'),vpm=require('..');
const originalDecoder=require('../../../scripts/grpc-conformance/node_modules/@grpc/grpc-js/build/src/stream-decoder').StreamDecoder,Decoder=require('../build/src/stream-decoder').StreamDecoder;
const loader=require('vgrpc-proto-loader'),{bind,unary,collect}=require('../../../scripts/grpc-conformance/consumers.cjs');
function frame(size){const b=Buffer.alloc(size+5,42);b[0]=0;b.writeUInt32BE(size,1);return b;}
const cases=[],add=(name,make,validate,async=false)=>cases.push({name,make,validate,async});
for(const [name,chunks]of [['complete 128B',[frame(128)]],['complete 16KiB',[frame(16384)]],['coalesced 16 x 128B',[Buffer.concat(Array.from({length:16},()=>frame(128)))]],['fragmented 16KiB',(()=>{const f=frame(16384);return Array.from({length:17},(_,i)=>f.subarray(i*1024,(i+1)*1024));})()]]) {
  const expected=chunks.reduce((sum,b)=>sum+b.length,0);
  add('decode / '+name,lib=>{const C=lib===upstream?originalDecoder:Decoder,d=new C(1024*1024);return()=>{let bytes=0;for(const chunk of chunks)for(const result of d.write(chunk))bytes+=result.length;return bytes;};},x=>assert.equal(x,expected));
}
const headers={authorization:'Bearer fixture','x-goog-request-params':'name=projects/p/databases/d','x-goog-api-client':'fixture','x-trace-bin':'AQID','content-type':'application/grpc','user-agent':'fixture'};
add('metadata / parse six headers',lib=>()=>lib.Metadata.fromHttp2Headers(headers),x=>assert.equal(x.get('authorization')[0],'Bearer fixture'));
add('metadata / outgoing six headers',lib=>{const m=lib.Metadata.fromHttp2Headers(headers);return()=>m.toHttp2Headers();},x=>assert.deepEqual(x,headers));
add('metadata / clone six headers',lib=>{const m=lib.Metadata.fromHttp2Headers(headers);return()=>m.clone();},x=>assert.equal(x.get('authorization')[0],'Bearer fixture'));
const service=loader.fromJSON({nested:{Msg:{fields:{text:{id:1,type:'string'}}},Service:{methods:{Echo:{requestType:'Msg',responseType:'Msg'},List:{requestType:'Msg',responseType:'Msg',responseStream:true}}}}});
add('construct / service client class',lib=>()=>lib.loadPackageDefinition(service).Service,x=>assert.equal(typeof x.prototype.echo,'function'));
const resources=[];
for(const streaming of [false,true]) add(streaming?'RPC / server stream of 16':'RPC / unary echo',async lib=>{
  const server=new lib.Server({'grpc.enable_channelz':0});server.addService(service.Service,{echo:(call,done)=>done(null,call.request),list:call=>{for(let i=0;i<16;i++)call.write(call.request);call.end();}});
  const port=await bind(server,lib.ServerCredentials.createInsecure()),Client=lib.loadPackageDefinition(service).Service,client=new Client('127.0.0.1:'+port,lib.credentials.createInsecure(),{'grpc.enable_channelz':0});resources.push({server,client});
  const request={text:'hello é漢'},metadata=new lib.Metadata();await unary(client,'echo',request,metadata);
  return streaming?()=>collect(client.list(request,{deadline:Date.now()+5000})):()=>unary(client,'echo',request,metadata);
},x=>streaming?(assert.equal(x.length,16),assert.equal(x[15].text,'hello é漢')):assert.equal(x.text,'hello é漢'),true);
const fs=require('node:fs'),root=path.resolve(__dirname,'..'),source=path.dirname(require.resolve('../../../scripts/grpc-conformance/node_modules/@grpc/grpc-js'));
const files=['package.json','PROVENANCE.json','index.js','index.mjs','bench/compare.cjs','../../scripts/grpc-conformance/consumers.cjs','../../scripts/grpc-conformance/package-lock.json',...fs.readdirSync(path.join(root,'build/src')).filter(x=>x.endsWith('.js')).map(x=>'build/src/'+x),...['stream-decoder.js','metadata.js','make-client.js'].map(x=>path.relative(root,path.join(source,x))),'../vgrpc-proto-loader/index.js','../vordered-map/index.js'];
require('../../../scripts/bench-paired.cjs').run({root,upstream,vpm,cases,files,cleanup:async()=>{for(const{client,server}of resources){client.close();server.forceShutdown();}}}).catch(error=>{console.error(error);process.exitCode=1;});
