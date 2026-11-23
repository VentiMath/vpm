'use strict';
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),upstream=path.resolve(__dirname,'../../../scripts/path-scurry-conformance/node_modules/path-scurry');
let directory;
function fixture(){
 if(directory)return directory;
 directory=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vpath-bench-')));
 for(let d=0;d<8;d++){fs.mkdirSync(directory+'/dir'+d);for(let i=0;i<12;i++)fs.writeFileSync(directory+`/dir${d}/file${i}.ts`,'data');}
 process.once('exit',()=>fs.rmSync(directory,{recursive:true,force:true}));return directory;
}
const cases=[
 {name:'cold resolve 200 paths',make(file){const {PathScurryPosix}=require(file);return()=>{const s=new PathScurryPosix('/project');let n=0;for(let i=0;i<200;i++)n+=s.resolve('src/dir'+i%10+'/file'+i+'.ts').length;return n;};},validate:n=>assert.equal(n,5490)},
 {name:'warm resolve 1000 paths',make(file){const {PathScurryPosix}=require(file),s=new PathScurryPosix('/project');for(let i=0;i<50;i++)s.resolve('src/file'+i+'.ts');return()=>{let n=0;for(let i=0;i<1000;i++)n+=s.resolve('src/file'+i%50+'.ts').length;return n;};},validate:n=>assert.equal(n,21800)},
 {name:'cold filesystem walk 105 entries',make(file){const {PathScurry}=require(file),cwd=fixture();return()=>new PathScurry(cwd).walkSync().length;},validate:n=>assert.equal(n,105)},
 {name:'cached directory read 1000',make(file){const {PathScurry}=require(file),s=new PathScurry(fixture());s.readdirSync();return()=>{let n=0;for(let i=0;i<1000;i++)n+=s.readdirSync().length;return n;};},validate:n=>assert.equal(n,8000)},
 {name:'warm walk 105 entries',make(file){const {PathScurry}=require(file),s=new PathScurry(fixture());s.walkSync();return()=>s.walkSync().length;},validate:n=>assert.equal(n,105)},
 {name:'warm async stream 105 entries',async:true,make(file){const {PathScurry}=require(file),s=new PathScurry(fixture());s.walkSync();return async()=>(await s.stream().collect()).length;},validate:n=>assert.equal(n,105)},
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','bench/compare.cjs','../../scripts/path-scurry-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1;});
