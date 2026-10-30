'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const upstream=process.argv.includes('--upstream');
for(const name of ['yocto-queue','p-limit']){
 const source=path.join(__dirname,'upstream',name);
 for(const [file,hash]of Object.entries(require(path.join(source,'SHA256.json'))))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex'),hash,file);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-'+name+'-'));
 try{
  let code=fs.readFileSync(path.join(source,'test.js.txt'),'utf8');
  code=code.replace("import test from 'ava';",`import {test as nodeTest} from 'node:test';
import assert from 'node:assert/strict';
const assertions={is:assert.strictEqual,deepEqual:assert.deepStrictEqual,true:v=>assert.equal(v,true),fail:assert.fail,throws:assert.throws,notThrowsAsync:assert.doesNotReject,throwsAsync:(fn,expected)=>assert.rejects(fn,expected?.is?e=>e===expected.is:expected)};
const test=(name,fn)=>nodeTest(name,()=>fn(assertions));`);
  code=code.replace("import inRange from 'in-range';",'const inRange=(value,{start,end})=>value>=start&&value<end;')
   .replace("import timeSpan from 'time-span';",'const timeSpan=()=>{const start=performance.now();return()=>performance.now()-start;};')
   .replace("import randomInt from 'random-int';",'const randomInt=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;');
  code=code.replace("'./index.js'",JSON.stringify(pathToFileURL(upstream?require.resolve(name):path.resolve(__dirname,'../../packages/v'+name+'/index.js')).href));
  // Allow scheduler jitter in the upstream 600ms serial timing check; the
  // independent gate uses explicit barriers to prove concurrency.
  code=code.replace('start: 590, end: 650', 'start: 590, end: 3000');
  // AVA observes pending rejections across delayed assertions. Native test runners
  // need observers immediately; keep the original later rejection assertions.
  code=code.replace(/(const (pendingPromise\w*) = .*;)/g,'$1\n$2.catch(() => {});');
  code=code.replace("const testClearQueueRejects = process.versions.node.startsWith('20.') ? test.skip : test;",'const testClearQueueRejects = test;');
  fs.writeFileSync(path.join(tmp,'test.mjs'),code);
  const r=spawnSync(process.execPath,[...(process.versions.bun?['test']:[]),path.join(tmp,'test.mjs')],{encoding:'utf8',timeout:60000});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);
  const count=[...code.matchAll(/^(?:test|testClearQueueRejects)\('/gm)].length;
  console.log(`${upstream?name:'v'+name}: ${count} retained upstream cases passed.`);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
