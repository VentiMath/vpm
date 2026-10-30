'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const source=path.join(__dirname,'upstream'),upstream=process.argv.includes('--upstream');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex'),hash,file);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-paginator-'));
try {
 fs.mkdirSync(path.join(tmp,'test'));fs.mkdirSync(path.join(tmp,'src'));fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(tmp,'node_modules'),'dir');
 const base=upstream?path.dirname(require.resolve('@google-cloud/paginator')):path.resolve(__dirname,'../../packages/vpaginator');
 for(const file of ['index.js','resource-stream.js'])fs.writeFileSync(path.join(tmp,'src',file),fs.readFileSync(path.join(base,file),'utf8').replace("require('vextend')",'require('+JSON.stringify(path.resolve(__dirname,'../../packages/vextend'))+')'));
 for(const file of ['index','resource-stream']){
  let text=fs.readFileSync(path.join(source,'test',file+'.ts.txt'),'utf8');
  if(file==='index'){
   const importLine="import {paginator, ParsedArguments, ResourceStream} from '../src';";
   assert(text.includes(importLine));text=text.replace(importLine,'');
   const end=text.indexOf('\n});',text.indexOf("jest.mock("))+4;
   text=text.slice(0,end)+'\n'+importLine+text.slice(end);
   text=text.replace('const anotherMethod = FakeClass.prototype.anotherMethodToExtend;', 'FakeClass.prototype.anotherMethodToExtend = () => {};\n      const anotherMethod = FakeClass.prototype.anotherMethodToExtend;');
  }
  fs.writeFileSync(path.join(tmp,'test',file+'.ts'),text);
 }
 fs.writeFileSync(path.join(tmp,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'CommonJS',noCheck:true,rootDir:'test',outDir:'compiled'},include:['test/*.ts']}));
 let r=spawnSync(process.execPath,[path.resolve(__dirname,'../../node_modules/typescript/bin/tsc'),'-p',path.join(tmp,'tsconfig.json')],{encoding:'utf8'});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);
 // TypeScript emits test/*.ts into compiled/*.js, so put them back under test/.
 for(const file of ['index','resource-stream'])fs.copyFileSync(path.join(tmp,'compiled',file+'.js'),path.join(tmp,'test',file+'.js'));
 fs.writeFileSync(path.join(tmp,'setup.cjs'),`
 const path=require('node:path');global.expect=require('expect').expect;
 const mocks=new (require('jest-mock').ModuleMocker)(globalThis),timers=require('@sinonjs/fake-timers');let clock;
 global.jest={fn:mocks.fn.bind(mocks),spyOn:mocks.spyOn.bind(mocks),restoreAllMocks:mocks.restoreAllMocks.bind(mocks),useFakeTimers(){clock=timers.install({toFake:['setTimeout','clearTimeout','setImmediate','clearImmediate','Date']});},useRealTimers(){if(clock){clock.uninstall();clock=null;}},runAllTimers(){clock.runAll();},mock(name,factory){const file=require.resolve(path.resolve(__dirname,'test',name));const actual=require(file);require.cache[file].exports={...actual,...factory()};}};
 `);
 let total=0;
 for(const file of ['index','resource-stream']){
  r=spawnSync(process.execPath,[require.resolve('mocha/bin/mocha'),'--require',path.join(tmp,'setup.cjs'),'--reporter','json',path.join(tmp,'test',file+'.js')],{encoding:'utf8',timeout:20000});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);const report=JSON.parse(r.stdout);assert.equal(report.stats.pending,0);total+=report.stats.passes;
 }
 assert.equal(total,65);console.log((upstream?'@google-cloud/paginator':'vpaginator')+': '+total+' upstream cases passed.');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
