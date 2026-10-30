'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-mime-browser-'));
try{
 const source=`import mime,{Mime} from ${JSON.stringify(path.resolve(__dirname,'../../packages/vmime/index.mjs'))};import lite from ${JSON.stringify(path.resolve(__dirname,'../../packages/vmime/lite.mjs'))};import standard from ${JSON.stringify(path.resolve(__dirname,'../../packages/vmime/types/standard.mjs'))};globalThis.result=[mime.getType('a.json'),lite.getType('a.docx'),new Mime(standard).getExtension('text/plain'),Object.isFrozen(standard['text/plain'])];`;
 fs.writeFileSync(path.join(dir,'entry.mjs'),source);
 const built=spawnSync('bun',['build',path.join(dir,'entry.mjs'),'--target=browser','--format=iife','--minify','--outfile='+path.join(dir,'bundle.js')],{encoding:'utf8'});assert.equal(built.status,0,built.stderr);
 const context={};vm.runInNewContext(fs.readFileSync(path.join(dir,'bundle.js'),'utf8'),context,{timeout:5000});assert.deepEqual(Array.from(context.result),['application/json',null,'txt',true]);
 console.log('vmime browser-target bundle executes without Node globals; full/lite/custom tables agree.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
