'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-builder-bundle-'));
try{
 const entry=path.join(directory,'entry.mjs'),out=path.join(directory,'bundle.js');
 fs.writeFileSync(entry,`import Builder from ${JSON.stringify(path.resolve(__dirname,'../../packages/vfast-xml-builder/index.mjs'))};globalThis.result=new Builder({sanitizeName:()=> 'safe',stopNodes:['r.raw']}).build({'bad name':{child:'<&'}});`);
 execFileSync('bun',['build',entry,'--target=browser','--minify','--outfile',out],{stdio:'pipe'});
 const context={};vm.runInNewContext(fs.readFileSync(out,'utf8'),context,{timeout:3000});assert.equal(context.result,'<safe><child>&lt;&amp;</child></safe>');
 console.log(`Browser XML builder bundle executes (${fs.statSync(out).size} bytes).`);
}finally{fs.rmSync(directory,{recursive:true,force:true});}
