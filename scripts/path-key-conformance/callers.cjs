"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{createRequire}=require('node:module');
const own=require(process.env.VPM_PATH_KEY_ENTRY||'../../packages/vpath-key');
const source=require.resolve('cross-spawn/lib/util/resolveCommand'),text=fs.readFileSync(source,'utf8'),local=createRequire(source);
function load(fn,platform,which){const module={exports:{}};const wrapper=vm.runInThisContext('(function(require,module,exports){'+text+'\n})',{filename:source});wrapper(id=>id==='path-key'?opts=>fn({...opts,platform}):id==='which'?which:local(id),module,module.exports);return module.exports;}
(async()=>{
 const controls=[(await import('path-key')).default,require('path-key-app')];let count=0;
 for(const platform of ['linux','darwin','win32'])for(const env of [{Path:'one'},{PATH:'two',Path:'three'},{PATH:''},{HOME:'synthetic'},Object.assign(Object.create({PATH:'inherited'}),{Path:'own'})]){
  const probe=fn=>{const calls=[];const resolve=load(fn,platform,{sync(command,options){calls.push({command,...options});return '/synthetic/command'}});const result=resolve({command:'synthetic',options:{env}});return{calls,result}};
  for(const control of controls)assert.deepEqual(probe(own),probe(control));count++;
 }
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vpath-key-caller-'));
 try{const exe=dir+'/vpm-test-tool';fs.writeFileSync(exe,'#!/bin/sh\nexit 0\n',{mode:0o755});const resolve=load(own,process.platform,local('which'));assert.equal(resolve({command:'vpm-test-tool',options:{env:{PATH:dir}}}),exe);assert.equal(resolve({command:'does-not-exist',options:{env:{PATH:dir}}}),undefined)}finally{fs.rmSync(dir,{recursive:true,force:true})}
 console.log(count+' unchanged cross-spawn resolver environment cases and real host executable lookup pass; no command executed.');
})().catch(e=>{console.error(e);process.exitCode=1});
