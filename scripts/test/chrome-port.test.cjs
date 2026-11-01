'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const chromePort=require('../floating-react-conformance/chrome-port.cjs');
test('Chrome port discovery waits through missing, empty and partial startup writes',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vpm-chrome-port-')),file=path.join(dir,'DevToolsActivePort');
 const pause=()=>new Promise(resolve=>setTimeout(resolve,25));let ready=false;
 try{const result=chromePort(file).then(port=>{ready=true;return port;});await pause();assert.equal(ready,false);await fs.writeFile(file,'');await pause();assert.equal(ready,false);await fs.writeFile(file,'41234\n');await pause();assert.equal(ready,false);await fs.writeFile(file,'41234\n/devtools/browser/example\n');assert.equal(await result,41234);await fs.writeFile(file,'0\n/devtools/browser/example');await assert.rejects(chromePort(file,30),/did not become ready/);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
