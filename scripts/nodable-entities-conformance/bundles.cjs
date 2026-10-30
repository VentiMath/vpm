'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-entity-bundles-'));
try{
 const entry=path.resolve(__dirname,'../../packages/vnodable-entities/index.mjs'),sizes={};
 for(const [name,source,expected]of [
  ['xml',`import {EntityDecoder,XML} from ${JSON.stringify(entry)};globalThis.result=new EntityDecoder({namedEntities:XML}).decode('&lt;');`,'<'],
  ['all',`import {EntityDecoder,ALL_ENTITIES} from ${JSON.stringify(entry)};globalThis.result=new EntityDecoder({namedEntities:ALL_ENTITIES}).decode('&ocirc;&boxDl;&af;');`,'ô╖\u2061'],
  ['encoder',`import {EntityEncoder} from ${JSON.stringify(entry)};globalThis.result=new EntityEncoder({encodeAllNamed:false}).encode('<');`,'&lt;'],
 ]){
  const file=path.join(directory,name+'.mjs'),output=path.join(directory,name+'.js');fs.writeFileSync(file,source);
  const result=spawnSync('bun',['build',file,'--target','browser','--minify','--outfile',output],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const code=fs.readFileSync(output,'utf8'),context={};vm.runInNewContext(code,context);assert.equal(context.result,expected);sizes[name]=Buffer.byteLength(code);
  if(name!=='all')assert.doesNotMatch(code,/boxDl|NotGreaterFullEqual|ocirc/);
 }
 assert.ok(sizes.all>sizes.xml*1.5);console.log('Browser bundles execute; unused entity tables removed: '+JSON.stringify(sizes)+' bytes.');
}finally{fs.rmSync(directory,{recursive:true,force:true});}
