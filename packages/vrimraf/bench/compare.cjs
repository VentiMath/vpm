'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),upstream=path.resolve(__dirname,'../../../scripts/rimraf-conformance/node_modules/rimraf');
let directory;
function fixture(){if(!directory){directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vrimraf-bench-')));process.once('exit',()=>fs.rmSync(directory,{recursive:true,force:true}));}return directory;}
function seed(cwd){fs.mkdirSync(cwd+'/Products/App',{recursive:true});for(let i=0;i<8;i++)fs.writeFileSync(cwd+'/Products/App/'+i,'payload');}
const cases=[
 {name:'sync missing path',make(file){const lib=require(file),p=fixture()+'/missing';return()=>lib.rimrafSync(p);},validate:n=>assert.equal(n,true)},
 {name:'async missing path',async:true,make(file){const lib=require(file),p=fixture()+'/missing';return()=>lib.rimraf(p);},validate:n=>assert.equal(n,true)},
 {name:'create and sync remove archive (8 files)',make(file){const lib=require(file),p=fixture()+'/App.xcarchive';return()=>{seed(p);return lib.rimraf.sync(p);};},validate:n=>{assert.equal(n,true);assert(!fs.existsSync(fixture()+'/App.xcarchive'));}},
 {name:'create and async remove archive (8 files)',async:true,make(file){const lib=require(file),p=fixture()+'/App.xcarchive';return async()=>{seed(p);return lib.rimraf(p);};},validate:n=>{assert.equal(n,true);assert(!fs.existsSync(fixture()+'/App.xcarchive'));}},
 {name:'create and filtered async remove (8 files)',async:true,make(file){const lib=require(file),p=fixture()+'/App.xcarchive',options={filter:name=>!name.endsWith('/keep')};return async()=>{seed(p);return lib.rimraf(p,options);};},validate:n=>{assert.equal(n,true);assert(!fs.existsSync(fixture()+'/App.xcarchive'));}},
 {name:'create and glob remove 8 files',async:true,make(file){const lib=require(file),cwd=fixture(),options={glob:{cwd,nodir:true}};return async()=>{seed(cwd+'/files');return lib.rimraf('files/**/*',options);};},validate:n=>{assert.equal(n,true);assert.deepEqual(fs.readdirSync(fixture()+'/files/Products/App'),[]);}},
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','bench/compare.cjs','../vglob/index.cjs','../vminimatch/index.cjs','../vpath-scurry/index.cjs','../vminipass/index.cjs','../../scripts/rimraf-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1;});
