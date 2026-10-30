'use strict';
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const cjs=require('./node_modules/fast-xml-parser'),esm=await import(pathToFileURL(path.join(__dirname,'node_modules/fast-xml-parser/src/fxp.js')).href),vpm=require('../../packages/vfast-xml-parser'),vesm=await import('../../packages/vfast-xml-parser/index.mjs');
 for(const name of ['XMLParser','XMLBuilder','XMLValidator'])assert.equal(vpm[name],vesm[name]);
 const cases=[['<r><x>1</x><x>2</x></r>',{}],['<r a="x">&lt;&amp;</r>',{ignoreAttributes:false}],['<r><raw><b>x</b></raw></r>',{stopNodes:['r.raw']}],['<r><a/><b/></r>',{preserveOrder:true}],['<!DOCTYPE r [<!ENTITY foo "bar">]><r>&foo;</r>',{}],['<?xml version="1.1"?><r>&#x1;</r>',{htmlEntities:true}],['<r a="1"/>',{attributesGroupName:'attrs',ignoreAttributes:false}]];
 for(const [xml,opts]of cases){const expected=new esm.XMLParser(opts).parse(xml);assert.deepEqual(new cjs.XMLParser(opts).parse(xml),expected);assert.deepEqual(new vpm.XMLParser(opts).parse(xml),expected);}
 const fs=require('node:fs'),os=require('node:os'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-parser-bundle-'));
 try{
  const entry=path.join(dir,'entry.mjs'),out=path.join(dir,'bundle.js');
  fs.writeFileSync(entry,`import {XMLParser,XMLBuilder,XMLValidator} from ${JSON.stringify(path.resolve(__dirname,'../../packages/vfast-xml-parser/index.mjs'))};globalThis.result=new XMLParser({htmlEntities:true}).parse(new TextEncoder().encode('<r>caf&#233;&amp;</r>'),true);globalThis.built=new XMLBuilder().build({r:'<&'});globalThis.valid=XMLValidator.validate('<r/>');`);
  execFileSync('bun',['build',entry,'--target=browser','--minify','--outfile',out],{stdio:'pipe'});
  const context={TextDecoder,TextEncoder,Uint8Array};vm.runInNewContext(fs.readFileSync(out,'utf8'),context,{timeout:3000});assert.equal(context.result.r,'café&');assert.equal(context.built,'<r>&lt;&amp;</r>');assert.equal(context.valid,true);
  console.log(`Browser-target parser bundle executes without Node globals (${fs.statSync(out).size} bytes).`);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 console.log('Published CJS/source ESM parser parity: 7 selected cases; VPM CJS/ESM exports share implementations.');
})().catch(e=>{console.error(e);process.exitCode=1;});
