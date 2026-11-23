'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),upstream=path.resolve(__dirname,'../../../scripts/glob-conformance/node_modules/glob');
let directory;
function fixture(){if(directory)return directory;directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vglob-bench-')));for(let d=0;d<8;d++){fs.mkdirSync(directory+'/dir'+d);for(let i=0;i<12;i++)fs.writeFileSync(directory+`/dir${d}/file${i}.${i%2?'ts':'js'}`,'data');}process.once('exit',()=>fs.rmSync(directory,{recursive:true,force:true}));return directory;}
const cases=[
 {name:'cold wildcard search 48 files',make(file){const g=require(file),cwd=fixture();return()=>g.globSync('**/*.ts',{cwd,nodir:true}).length;},validate:n=>assert.equal(n,48)},
 {name:'cold literal path',make(file){const g=require(file),cwd=fixture();return()=>g.globSync('dir3/file3.ts',{cwd,absolute:true}).length;},validate:n=>assert.equal(n,1)},
 {name:'warm cached search 48 files',make(file){const {Glob}=require(file),g=new Glob('**/*.ts',{cwd:fixture(),nodir:true});g.walkSync();return()=>g.walkSync().length;},validate:n=>assert.equal(n,48)},
 {name:'cleanup array with ignored subtree',make(file){const g=require(file),cwd=fixture();return()=>g.globSync(['**/*.ts','**/*.js'],{cwd,absolute:true,ignore:'dir0/**'}).length;},validate:n=>assert.equal(n,84)},
 {name:'warm async search 48 files',async:true,make(file){const {Glob}=require(file),g=new Glob('**/*.ts',{cwd:fixture(),nodir:true});g.walkSync();return async()=>(await g.walk()).length;},validate:n=>assert.equal(n,48)},
 {name:'warm async stream 48 files',async:true,make(file){const {Glob}=require(file),g=new Glob('**/*.ts',{cwd:fixture(),nodir:true});g.walkSync();return async()=>(await g.stream().collect()).length;},validate:n=>assert.equal(n,48)},
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','bench/compare.cjs','../vminimatch/index.cjs','../vpath-scurry/index.cjs','../vminipass/index.cjs','../../scripts/glob-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1;});
