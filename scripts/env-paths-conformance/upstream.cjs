'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process'),{load}=require('./load.cjs');
const metadata=require('./upstream.json');for(const [file,digest]of Object.entries(metadata.files))assert.equal(createHash('sha256').update(fs.readFileSync(__dirname+'/upstream/'+file)).digest('hex'),digest);
const compiled=__dirname+'/node_modules/.env-paths-tests.cjs';execFileSync('bun',['build',__dirname+'/upstream/test.js','--target=node','--format=cjs','--external','*','--outfile='+compiled],{stdio:'pipe'});
let count=0;
for(const platform of ['darwin','linux']){
 const env={},context={platform,home:'/home/test',temp:'/tmp',env},fn=load(path.resolve(__dirname,'../../packages/venv-paths/index.cjs'),context).fn;
 const test=(name,body)=>{body({true:v=>assert.equal(v,true,name),throws:(f,expected)=>assert.throws(f,expected,name)});count++;};
 const mod={exports:{}};
 vm.runInNewContext('(function(require,module,exports,process,console){'+fs.readFileSync(compiled,'utf8')+'\n})',{},{filename:compiled})(name=>name==='ava'?test:name==='./index.js'?fn:name==='node:process'?{platform,env}:(()=>{throw Error('Unexpected test import '+name)})(),mod,mod.exports,{platform,env},{log(){}});
}
console.log(`${count} unchanged upstream tests pass (5 macOS, 6 Linux); original assertions execute via a minimal AVA assertion adapter.`);
