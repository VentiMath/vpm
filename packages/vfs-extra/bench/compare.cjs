'use strict';
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),upstream=path.resolve(__dirname,'../../../scripts/fs-extra-conformance/node_modules/fs-extra'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vfs-extra-bench-'));
fs.mkdirSync(tmp+'/source/nested',{recursive:true});for(let i=0;i<8;i++)fs.writeFileSync(tmp+'/source/nested/'+i+'.js','asset '.repeat(100));fs.writeFileSync(tmp+'/existing','stable');fs.writeFileSync(tmp+'/move-a','move');
const config={appId:'org.ventimath.example',webDir:'dist',plugins:{Keyboard:{resize:'body'}}},cases=[
 {name:'ensure existing file (sync)',make(file){const io=require(file);return()=>{io.ensureFileSync(tmp+'/existing');return fs.statSync(tmp+'/existing').size}},validate:n=>assert.equal(n,6)},
 {name:'pathExists (async)',async:true,make(file){const io=require(file);return()=>io.pathExists(tmp+'/existing')},validate:n=>assert.equal(n,true)},
 {name:'output JSON to existing parent (async)',async:true,make(file){const io=require(file);return()=>io.outputJSON(tmp+'/config.json',config,{spaces:'\t'})},validate:n=>{assert.equal(n,undefined);assert.deepEqual(JSON.parse(fs.readFileSync(tmp+'/config.json','utf8')),config)}},
 {name:'copy eight assets and clear destination (sync)',make(file){const io=require(file);return()=>{fs.rmSync(tmp+'/dest',{force:true,recursive:true});io.copySync(tmp+'/source',tmp+'/dest');return fs.readdirSync(tmp+'/dest/nested').length}},validate:n=>assert.equal(n,8)},
 {name:'copy eight assets and clear destination (async)',async:true,make(file){const io=require(file);return async()=>{await fs.promises.rm(tmp+'/dest',{force:true,recursive:true});await io.copy(tmp+'/source',tmp+'/dest');return fs.readdirSync(tmp+'/dest/nested').length}},validate:n=>assert.equal(n,8)},
 {name:'move file out and back (async)',async:true,make(file){const io=require(file);return async()=>{await io.move(tmp+'/move-a',tmp+'/move-b');await io.move(tmp+'/move-b',tmp+'/move-a');return fs.readFileSync(tmp+'/move-a','utf8')}},validate:n=>assert.equal(n,'move')}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','native.cjs','operations.cjs','../vjsonfile/index.cjs','../vjsonfile/utils.cjs','bench/compare.cjs','../../scripts/fs-extra-conformance/package-lock.json'],cleanup(){fs.rmSync(tmp,{recursive:true,force:true})}}).catch(error=>{console.error(error);process.exitCode=1});
