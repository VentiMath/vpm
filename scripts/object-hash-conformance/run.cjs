'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const upstream=process.argv.includes('--upstream'),snapshot=path.join(__dirname,'upstream'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-object-hash-suite-'));
try{
 for(const[file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(snapshot,file))).digest('hex'),hash,file);
 assert.equal(require('./node_modules/object-hash/package.json').version,'3.0.0');assert.equal(fs.readFileSync(path.join(snapshot,'index.js.txt'),'utf8'),fs.readFileSync(require.resolve('./node_modules/object-hash'),'utf8'));
 const target=upstream?require.resolve('./node_modules/object-hash'):require.resolve('../../packages/vobject-hash');
 fs.writeFileSync(path.join(temp,'index.js'),'module.exports=require('+JSON.stringify(target)+');');fs.mkdirSync(path.join(temp,'test'));
 for(const file of fs.readdirSync(path.join(snapshot,'test'))){let s=fs.readFileSync(path.join(snapshot,'test',file),'utf8');
  // Bun exposes File/Timeout tags differently and read() may return a single
  // available chunk. Adapt fixture plumbing identically without dropping tests.
  if(file==='blob.js.txt')s=s.replace("var assert = require('assert');", "var assert = require('assert');\nvar NativeFile=globalThis.File;var File=class extends NativeFile {constructor(...args){super(...args);Object.defineProperty(this,Symbol.toStringTag,{value:'File'});}};");
  if(file==='types.js.txt')s=s.replace('var timer = setTimeout(function() {}, 0);', "var timer = setTimeout(function() {}, 0);Object.defineProperty(timer,Symbol.toStringTag,{value:'Timer'});clearTimeout(timer);");
  s=s.replaceAll('strm.read().toString()', "(()=>{const chunks=[];let chunk;while((chunk=strm.read())!==null)chunks.push(chunk);return Buffer.concat(chunks).toString();})()");
  if(file==='blob.js.txt'){
   // The browser-era fixture omitted this local and used different names in its
   // same-metadata test. Correct those defects identically in both controls.
   s=s.replace("var hash = require('../index');","var hash = require('../index');\nvar validSha1 = /^[0-9a-f]{40}$/i;");
   const start=s.indexOf("it('should ignore file content'");s=s.slice(0,start)+s.slice(start).replace("'bar', {","'foo', {");
  }
  // DataView now hashes its actual byte window instead of being an opaque token.
  if(!upstream&&file==='object-classes.js.txt')s=s.replace("'httpparser', 'dataview', 'signal'","'httpparser', 'signal'");
  fs.writeFileSync(path.join(temp,'test',file.replace('.txt','')),s);
 }
 const r=spawnSync(process.execPath,[path.join(__dirname,'node_modules/mocha/bin/mocha.js'),'--no-config','--no-package','--reporter','dot',path.join(temp,'test/*.js')],{encoding:'utf8',timeout:30000});console.log(r.stdout+r.stderr);assert.equal(r.status,0,String(r.error||'upstream suite failed'));
 console.log((upstream?'Upstream':'VPM')+' object-hash retained suite passed.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
