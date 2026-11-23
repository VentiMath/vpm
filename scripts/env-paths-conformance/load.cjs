'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
function currentControl(){
  const file=path.join(__dirname,'node_modules/.env-paths-control.cjs');
  execFileSync('bun',['build',path.join(__dirname,'node_modules/env-paths/index.js'),'--target=node','--format=cjs','--packages=external','--outfile='+file],{stdio:'pipe'});
  return file;
}
function load(file, context){
  const {platform,home,temp,env}=context,paths=platform==='win32'?path.win32:path.posix;
  const processStub={platform,env},osStub={homedir:()=>home,tmpdir:()=>temp};
  const mod={exports:{}},native=createRequire(file);
  const require=name=>name==='node:path'||name==='path'?paths:name==='node:os'||name==='os'?osStub:name==='node:process'||name==='process'?processStub:native(name);
  vm.runInNewContext('(function(require,module,exports,process){'+fs.readFileSync(file,'utf8')+'\n})',{},{filename:file})(require,mod,mod.exports,processStub);
  const fn=mod.exports.default||mod.exports;
  return {fn,process:processStub,os:osStub};
}
module.exports={load,currentControl};
