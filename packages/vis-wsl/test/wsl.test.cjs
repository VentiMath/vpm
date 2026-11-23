'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const {context,loadWsl,stack} = require('../../../scripts/container-conformance/load.cjs');
const file = path.resolve(__dirname,'../index.cjs');
for (const [name,options,expected] of [
  ['Windows is not WSL',{platform:'win32',release:'Microsoft'},false],
  ['macOS does not probe Linux paths',{platform:'darwin'},false],
  ['WSL1 release',{release:'3.4.0-Microsoft'},true],
  ['WSL2 proc version',{entries:{'/proc/version':'Linux 4.19-microsoft-standard'}},true],
  ['custom kernel interop',{entries:{'/proc/sys/fs/binfmt_misc/WSLInterop':''}},true],
  ['custom kernel run directory',{entries:{'/run/WSL':''}},true],
  ['restricted proc still checks WSL paths',{entries:{'/proc/version':new Error('EACCES'),'/run/WSL':''}},true],
  ['ordinary Linux',{entries:{'/proc/version':'Linux 6.12'}},false],
]) {
  test(name,()=>{
    const ctx=context(options);let calls=0;
    assert.equal(loadWsl(file,ctx,()=>{calls++;return false}),expected);
    assert.equal(calls,expected?1:0);
    if (options.platform) assert.deepEqual(ctx.calls,[]);
  });
}
test('Docker and Podman on WSL are not WSL hosts',()=>{
  for(const entries of [{'/run/.containerenv':''},{'/.dockerenv':''},{'/proc/self/mountinfo':'/docker/containers/id/hosts'}]) {
    assert.equal(stack(context({release:'Microsoft',entries}),{wslFile:file}).wsl,false);
  }
});
test('private test mode delays detection; the normal export is a snapshot',()=>{
  const ctx=context({testMode:true,release:'Microsoft'});
  const detect=loadWsl(file,ctx,()=>false);assert.equal(typeof detect,'function');assert.deepEqual(ctx.calls,[]);
  assert.equal(detect(),true);ctx.process.platform='darwin';assert.equal(detect(),false);
  const normal=context({release:'Microsoft'});const snapshot=loadWsl(file,normal,()=>false);
  normal.process.platform='darwin';assert.equal(snapshot,true);
});
test('CommonJS and ESM export the same boolean',async()=>{
  const cjs=require('../index.cjs');assert.equal(typeof cjs,'boolean');assert.equal((await import('../index.mjs')).default,cjs);
});
