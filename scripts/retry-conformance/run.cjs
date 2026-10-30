'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const upstream=process.argv.includes('--upstream');
for(const name of ['retry','async-retry']){
 const source=path.join(__dirname,'upstream',name);
 for(const [file,hash]of Object.entries(require(path.join(source,'SHA256.json'))))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex'),hash,file);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-'+name+'-'));
 try{
  fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(tmp,'node_modules'),'dir');
  fs.mkdirSync(path.join(tmp,'lib'));fs.mkdirSync(path.join(tmp,'test'));
  const target=upstream?require.resolve(name):path.resolve(__dirname,'../../packages/v'+name);
  fs.writeFileSync(path.join(tmp,'lib/index.js'),'module.exports=require('+JSON.stringify(target)+');');
  fs.writeFileSync(path.join(tmp,'lib/retry.js'),'module.exports=require('+JSON.stringify(target)+');');
  let count=0;
  if(name==='retry'){
   fs.mkdirSync(path.join(tmp,'test/integration'));fs.writeFileSync(path.join(tmp,'test/common.js'),fs.readFileSync(path.join(source,'test/common.js.txt'),'utf8').replace("require('fake')",'require('+JSON.stringify(path.join(__dirname,'callback-expectations.cjs'))+')'));
   const files=fs.readdirSync(path.join(source,'test/integration'));
   for(const file of files){let code=fs.readFileSync(path.join(source,'test/integration',file),'utf8');count+=[...code.matchAll(/\(function \w+/g)].length;
    // Repair two upstream loops which compare an integer to an array and never run.
    code=code.replaceAll('i < timeouts;', 'i < timeouts.length;').replace('var lastTimeout = timeouts[0];\n  for (var i = 0;', 'var lastTimeout = timeouts[0];\n  for (var i = 1;');
    fs.writeFileSync(path.join(tmp,'test/integration',file.replace(/\.txt$/,'')),code);
   }
   fs.writeFileSync(path.join(tmp,'run.cjs'),`const assert=require('node:assert/strict');const clock=require('@sinonjs/fake-timers').install({now:10000,toFake:['Date','performance','setTimeout','clearTimeout']});Math.random=()=>0.5;try{${files.map(f=>'require('+JSON.stringify('./test/integration/'+f.replace(/\.txt$/,''))+');').join('\n')}clock.runAll();require(${JSON.stringify(path.join(__dirname,'callback-expectations.cjs'))})._autoVerify();assert.equal(clock.countTimers(),0);console.log('VPM_CONFORMANCE_COMPLETE');}finally{clock.uninstall();}`);
  }else{
   let code=fs.readFileSync(path.join(source,'test/index.js.txt'),'utf8');count=[...code.matchAll(/^test\('/gm)].length;
   code=code.replace("const test = require('ava');", "const cases=[];const test=(name,fn)=>cases.push({name,fn});const assert=require('node:assert/strict');")
    .replace("const fetch = require('node-fetch');", "const fetch=url=>url.includes('fakewikipedia')?Promise.reject(new Error('fixture network failure')):Promise.resolve({status:200});")
    .replace("const sleep = require('then-sleep');", 'const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));');
   code+=`\n(async()=>{const clock=require('@sinonjs/fake-timers').install({now:10000,toFake:['Date','performance','setTimeout','clearTimeout']});Math.random=()=>0.5;try{for(const item of cases){let error;const completed=Promise.resolve().then(()=>item.fn({deepEqual:assert.deepStrictEqual})).catch(e=>{error=e;});await clock.runAllAsync();await completed;if(error)throw error;assert.equal(clock.countTimers(),0,item.name);}console.log('VPM_CONFORMANCE_COMPLETE');}finally{clock.uninstall();}})().catch(e=>{console.error(e);process.exitCode=1;});\n`;
   fs.writeFileSync(path.join(tmp,'test/index.js'),code);fs.writeFileSync(path.join(tmp,'run.cjs'),"require('./test/index.js');");
  }
  const r=spawnSync(process.execPath,[path.join(tmp,'run.cjs')],{encoding:'utf8',timeout:20000});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/VPM_CONFORMANCE_COMPLETE/,'suite must finish');
  console.log(`${upstream?name:'v'+name}: ${count} retained upstream cases passed with deterministic clocks.`);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
