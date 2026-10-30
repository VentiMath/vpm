'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const upstream=process.argv.includes('--upstream');
for(const name of ['promisify','projectify']){
 const source=path.join(__dirname,'upstream',name);
 for(const [file,hash]of Object.entries(require(path.join(source,'SHA256.json'))))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(source,file))).digest('hex'),hash,file);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-'+name+'-'));
 try{
  fs.mkdirSync(path.join(tmp,'test'));fs.mkdirSync(path.join(tmp,'src'));fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(tmp,'node_modules'),'dir');
  fs.writeFileSync(path.join(tmp,'src/index.js'),'module.exports=require('+JSON.stringify(upstream?require.resolve('@google-cloud/'+name):path.resolve(__dirname,'../../packages/v'+name))+');');
  let code=fs.readFileSync(path.join(source,'test/index.ts.txt'),'utf8').replace("import * as assert from 'assert';","import assert = require('assert');").replace("import * as util from '../src';","import util = require('../src');");
  if(name==='promisify'){
   code=code.replace("it('should call the callback only a single time when the promise resolves but callback throws an error', () => {", "it('should call the callback only a single time when the promise resolves but callback throws an error', done => {");
   code=code.replace('assert.ok(callback.calledOnce);','assert.ok(callback.calledOnce);\n      done();');
   code=code.replace("it('should return a promise when callback is not provided', () => {\n    func().then", "it('should return a promise when callback is not provided', () => {\n    return func().then");
   code=code.replace("it('should call the callback with error when promise rejects', () => {", "it('should call the callback with error when promise rejects', done => {");
   code=code.replace('func((err: Error) => assert.strictEqual(err, error));','func((err: Error) => {assert.strictEqual(err, error);done();});');
  }
  fs.writeFileSync(path.join(tmp,'test/index.ts'),code);
  fs.writeFileSync(path.join(tmp,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'CommonJS',noCheck:true,rootDir:'test',outDir:'compiled'},include:['test/*.ts']}));
  let r=spawnSync(process.execPath,[path.resolve(__dirname,'../../node_modules/typescript/bin/tsc'),'-p',path.join(tmp,'tsconfig.json')],{encoding:'utf8'});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);
  fs.copyFileSync(path.join(tmp,'compiled/index.js'),path.join(tmp,'test/index.js'));
  r=spawnSync(process.execPath,[require.resolve('mocha/bin/mocha'),'--reporter','json',path.join(tmp,'test/index.js')],{encoding:'utf8',timeout:20000});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);
  const report=JSON.parse(r.stdout);assert.equal(report.stats.pending,0);assert.equal(report.stats.passes,name==='promisify'?27:5);
  console.log((upstream?'@google-cloud/':'v')+name+': '+report.stats.passes+' upstream cases passed.');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
