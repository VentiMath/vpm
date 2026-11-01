'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-core-suite-'));
(async()=>{
 const manifest=require('./upstream/provenance.json'),files=[];
 for(const [name,hash]of Object.entries(manifest.files)){
  const bytes=fs.readFileSync(path.join(__dirname,'upstream',name));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name);
  if(!name.endsWith('.ts.txt'))continue;
  const dest=path.join(temp,'test',name.slice(0,-4));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);files.push(dest);
 }
 fs.writeFileSync(path.join(temp,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'CommonJS',noCheck:true,noResolve:true,outDir:'compiled',rootDir:'.'},files}));
 const result=spawnSync(process.execPath,[require('../platform-types.cjs').compiler().path,'-p',path.join(temp,'tsconfig.json')],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);
 const shims={'index.js':'runtime.mjs','computeCoordsFromPlacement.js':'geometry.mjs','middleware/autoPlacement.js':'selection.mjs','middleware/inline.js':'geometry.mjs'};
 for(const [file,target]of Object.entries(shims)){const dest=path.join(temp,'compiled/src',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,'module.exports=require('+JSON.stringify(path.join(root,'packages/vfloating-ui-core',target))+');');}
 const tests=[];globalThis.describe=(_name,fn)=>fn();globalThis.test=(name,fn)=>tests.push([name,fn]);globalThis.expect=value=>({toBe:expected=>assert.equal(value,expected),toEqual:expected=>assert.deepEqual(value,expected)});
 for(const file of files)require(file.replace('/test/','/compiled/test/').replace(/\.ts$/,'.js'));
 for(const [name,fn]of tests)try{await fn();}catch(error){error.message=name+': '+error.message;throw error;}
 console.log(tests.length+' unchanged Floating UI core 1.8.0 tests pass after TypeScript transpilation and module redirection.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>fs.rmSync(temp,{recursive:true,force:true}));
