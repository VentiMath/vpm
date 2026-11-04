'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const launch=require('./launch-chrome.cjs');
test('waits for a complete port file and reports early process failure with stderr',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vlx-launch-test-')),file=path.join(dir,'DevToolsActivePort');let child;
 try{
  child=spawn(process.execPath,['-e',`const fs=require('fs');fs.writeFileSync(process.argv[1],'12345');setTimeout(()=>fs.appendFileSync(process.argv[1],'\\n/devtools/browser/test'),80);setTimeout(()=>{},5000)`,file]);
  assert.equal(await launch.waitForPort(child,file,{timeout:2000}),12345);child.kill();
  child=spawn(process.execPath,['-e',"process.stderr.write('startup diagnostic');process.exit(17)"]);
  await assert.rejects(launch.waitForPort(child,path.join(dir,'missing'),{timeout:2000}),/Chrome exited \(17\).*\nChrome stderr: startup diagnostic/);
  child=spawn(process.execPath,['-e','setTimeout(()=>{},5000)']);
  await assert.rejects(launch.waitForPort(child,path.join(dir,'missing'),{timeout:60}),/within 60ms/);
 }finally{child?.kill();await fs.rm(dir,{recursive:true,force:true});}
});
test('a missing executable fails promptly instead of waiting for readiness',async()=>{
 await assert.rejects(launch('/nonexistent-vlx-chrome','/tmp/unused-vlx-profile'),/ENOENT/);
});
