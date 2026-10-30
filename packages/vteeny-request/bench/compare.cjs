'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http'), fs = require('node:fs');
const {Readable} = require('node:stream'), {gzipSync} = require('node:zlib');
const {run} = require('../../../scripts/bench-paired.cjs');
const upstream = require('../../../scripts/teeny-conformance/node_modules/teeny-request'), vpm = require('..');
const {start, proxy} = require('../../vhttp-proxy-agent/test/helpers.cjs');
const cleanups = [], lifecycle = {after: fn => cleanups.push(fn)}, cases = [];
const add = (name, make, validate, async = false) => cases.push({name, make, validate, async});
add('create defaults', lib => () => lib.teenyRequest.defaults({timeout:60000,gzip:true,forever:true,pool:{maxSockets:Infinity},headers:{'X-Test':'yes'}}), value => assert.equal(typeof value,'function'));
const body = Buffer.alloc(64*1024, 97), json = JSON.stringify({ok:true,message:'hello'}), zipped = gzipSync(json);
function callback(lib, options) {return new Promise((resolve, reject) => lib.teenyRequest(options,(error,response,body) => error ? reject(error) : resolve({response,body})));}
(async () => {
  const server = await start(lifecycle,http.createServer(async(req,res) => {
    if(req.url === '/download') {res.end(body);return;}
    if(req.url === '/multipart') {let size=0;for await(const c of req)size+=c.length;res.end(String(size));return;}
    if(req.url === '/post') {req.pipe(res);return;}
    if(req.url === '/text') {res.end('ok');return;}
    res.setHeader('Content-Type','application/json');
    if(req.url === '/gzip'){res.setHeader('Content-Encoding','gzip');res.end(zipped);return;}
    res.end(req.url === '/malformed' ? '{bad json' : json);
  }));
  const uri = 'http://127.0.0.1:' + server.address().port;
  for(const name of ['text','json','gzip']) add(name+' callback',lib=>()=>callback(lib,{uri:uri+'/'+name,forever:true}), value=>{assert.equal(value.response.statusCode,200);assert.deepEqual(value.body,name==='text'?'ok':JSON.parse(json));},true);
  add('JSON POST callback',lib=>()=>callback(lib,{uri:uri+'/post',method:'POST',json:{hi:1},forever:true}),value=>assert.equal(value.body,'{"hi":1}'),true);
  add('query + headers callback',lib=>()=>callback(lib,{uri,qs:{key:'a b',count:5},headers:{Authorization:'Bearer example','X-Test':'yes'},forever:true}),value=>assert.deepEqual(value.body,JSON.parse(json)),true);
  add('malformed JSON callback',lib=>()=>new Promise(resolve=>lib.teenyRequest({uri:uri+'/malformed',forever:true},error=>resolve(error))),value=>assert(value instanceof Error),true);
  add('64KiB streamed download',lib=>async()=>{const chunks=[];for await(const c of lib.teenyRequest({uri:uri+'/download',forever:true}))chunks.push(c);return Buffer.concat(chunks);},value=>assert.deepEqual(value,body),true);
  add('64KiB multipart upload',lib=>()=>callback(lib,{uri:uri+'/multipart',method:'POST',forever:true,headers:{},multipart:[{'Content-Type':'application/json',body:'{"name":"test"}'},{'Content-Type':'application/octet-stream',body:Readable.from([body])}]}),value=>assert.equal(Number(value.body),65751),true);
  add('eight concurrent JSON callbacks',lib=>()=>Promise.all(Array.from({length:8},()=>callback(lib,{uri,forever:true}))),values=>{assert.equal(values.length,8);for(const v of values)assert.deepEqual(v.body,JSON.parse(json));},true);
  const originAgent = new http.Agent({keepAlive:true}); cleanups.push(()=>originAgent.destroy());
  const plain = await proxy(lifecycle,false,undefined,originAgent), secure = await proxy(lifecycle,true,undefined,originAgent);
  for(const [name,p] of [['HTTP',plain],['TLS',secure]]) add(name+' proxy forever callback',lib=>()=>callback(lib,{uri,forever:true,proxy:p.url,pool:{rejectUnauthorized:false}}),value=>assert.deepEqual(value.body,JSON.parse(json)),true);
  const root = path.resolve(__dirname,'..');
  const files = ['index.js','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs',...fs.readdirSync(path.join(root,'lib')).map(file=>'lib/'+file),'../../scripts/teeny-conformance/package-lock.json','../../scripts/teeny-conformance/node_modules/teeny-request/package.json',...['index','agents','TeenyStatistics'].map(name=>'../../scripts/teeny-conformance/node_modules/teeny-request/build/src/'+name+'.js')];
  for(const pkg of ['vnode-fetch','vhttp-proxy-agent','vhttps-proxy-agent','vagent-base','vstream-events','vdebug','vms','viconv-lite'])for(const file of fs.readdirSync(path.join(root,'..',pkg),{recursive:true}))if(file.endsWith('.js')&&!/^(test|bench)\//.test(file))files.push('../'+pkg+'/'+file);
  files.push('../vhttp-proxy-agent/test/helpers.cjs','../vhttps-proxy-agent/test/helpers.cjs','../vagent-base/test/tls-key.pem','../vagent-base/test/tls-cert.pem');
  await run({root,upstream,vpm,cases,files,cleanup:async()=>{vpm.teenyRequest.close();const pool=require('../../../scripts/teeny-conformance/node_modules/teeny-request/build/src/agents').pool;for(const a of pool.values())a.destroy();pool.clear();for(const close of cleanups.reverse())await close();}});
})().catch(error=>{console.error(error);process.exitCode=1;});
