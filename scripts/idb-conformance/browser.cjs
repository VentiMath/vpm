"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const base=__dirname+'/node_modules/.vpm-idb',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vidb-browser-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 require('./build.cjs');
 server=http.createServer((req,res)=>{const name=req.url.slice(1);if(['current.js','app.js','vpm.js'].includes(name)){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+name));return;}res.setHeader('content-type','text/html');res.end('<!doctype html><title>Synthetic IndexedDB fixtures</title><script src="/'+name+'.js"></script>');});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 await send('Runtime.enable');
 const results={};
 for(const name of ['current','app','vpm']){
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
  await evaluate('(async()=>{for(let n=0;n<300&&!window.runIDB;n++)await new Promise(r=>setTimeout(r,10));if(!window.runIDB)throw Error("Fixture did not load")})()');
  results[name]=await evaluate('window.runIDB()');
  // Firebase owns persistent connections; isolate the next control in a new
  // origin by clearing databases after the page is no longer using them.
  await send('Page.navigate',{url:'about:blank'});await send('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:'+server.address().port,storageTypes:'indexeddb'});
 }
 assert.equal(results.vpm.transactionError,'ConstraintError');assert.deepEqual(results.vpm.recovery,{done:'committed',value:3});
 for(const name of ['current','app']){assert(['AbortError','ConstraintError'].includes(results[name].transactionError));assert.deepEqual({...results.vpm,transactionError:null,recovery:null},{...results[name],transactionError:null,recovery:null},name+' native and Firebase caller results');}
 assert.deepEqual(results.vpm.firebase,{heartbeat:true,fidStable:true,token:'fixture-token',storedFIDMatches:true,storedToken:'fixture-token',networkCalls:1});
 assert.deepEqual(exceptions,[]);fs.writeFileSync(path.join(os.tmpdir(),'vidb-native-results.json'),JSON.stringify(results,null,2));console.log('Native Chrome IndexedDB and unchanged Firebase heartbeat/installation persistence pass');
 }finally{socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
