'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{gzipSync}=require('node:zlib');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-camel-browser-'));
try {
 for(const [name,target]of [['upstream',require.resolve('./node_modules/lodash.camelcase')],['vpm',require.resolve('../../packages/vlodash.camelcase')]]){
  const entry=path.join(temporary,name+'.mjs'),out=path.join(temporary,name+'.js');
  fs.writeFileSync(entry,`import camelCase from ${JSON.stringify(target)};globalThis.results=['GetIamPolicy','XMLHttpRequest','déjà vu','hello 👩🏽‍💻 world'].map(camelCase);`);
  const built=spawnSync('bun',['build',entry,'--target=browser','--format=iife','--minify','--outfile='+out],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
  const code=fs.readFileSync(out,'utf8'),context=vm.createContext({},{codeGeneration:{strings:false,wasm:false}});
  vm.runInContext('globalThis.self=globalThis',context);
  vm.runInContext(code,context,{timeout:1000});
  if(name==='vpm'){const isolated=vm.createContext({},{codeGeneration:{strings:false,wasm:false}});vm.runInContext(code,isolated,{timeout:1000});assert.equal(isolated.results[0],'getIamPolicy');}
  assert.deepEqual(Array.from(context.results),['getIamPolicy','xmlHttpRequest','dejaVu','hello👩🏽‍💻World']);
  console.log(`${name}: browser IIFE ${Buffer.byteLength(code)} bytes, gzip ${gzipSync(code).length} bytes; no Node globals or string code generation.`);
 }
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
