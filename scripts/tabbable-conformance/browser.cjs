'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),{spawn,spawnSync}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-tabbable-browser-'));
const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(file=>fs.existsSync(file));
assert.ok(chrome,'Chrome is required; set CHROME_BIN');
const run=spawnSync('bun',[path.join(__dirname,'build-browser.cjs'),temp],{encoding:'utf8'});assert.equal(run.status,0,run.stdout+run.stderr);
let server;
(async()=>{
 const html=`<!doctype html><pre id="result">pending</pre><script type="module">import {run} from '/vpm.mjs';let result;try{result=run();}catch(error){result={error:error.stack};}document.body.innerHTML='';const pre=document.createElement('pre');pre.id='result';pre.textContent=JSON.stringify(result);document.body.append(pre);</script>`;
 server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else if(['/upstream.mjs','/vpm.mjs'].includes(req.url)){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(temp,req.url.slice(1))));}else {res.statusCode=404;res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const output=await new Promise((resolve,reject)=>{const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check','--no-proxy-server','--user-data-dir='+path.join(temp,'profile'),'--dump-dom','--virtual-time-budget=10000','http://127.0.0.1:'+server.address().port]);let out='',err='';const timer=setTimeout(()=>child.kill(),45000);child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('close',code=>{clearTimeout(timer);code===0?resolve(out):reject(new Error(err));});});
 const encoded=output.match(/<pre id="result">(.*?)<\/pre>/s)?.[1];assert.ok(encoded,output);
 const result=JSON.parse(encoded.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'));
 assert.equal(result.error,undefined);assert.ok(result.comparisons>500);assert.equal(result.regressions,6);console.log('Chrome:',result.comparisons,'fixture comparisons and',result.regressions,'focus regressions pass.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});});
