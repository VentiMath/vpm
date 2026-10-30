'use strict';
const assert=require('node:assert/strict');
async function run(){
 const upstream=(await import('./node_modules/mime/dist/src/index.js')).default,vpm=require('../../packages/vmime');
 const probes={
  'conflicting definition is atomic':mime=>{const m=new mime.Mime({'text/a':['a']});assert.throws(()=>m.define({'text/b':['b','a']}));assert.equal(m.getType('b'),null);assert.equal(m.getExtension('text/b'),null);assert.equal(m.getAllExtensions('text/b'),null);},
  'malformed later entry is atomic':mime=>{const m=new mime.Mime();assert.throws(()=>m.define({'text/a':['a'],'text/b':[23]}));assert.equal(m.getType('a'),null);},
  'prototype calls cannot edit frozen mappings':mime=>{const m=new mime.Mime({'text/a':['a']})._freeze();assert.throws(()=>mime.Mime.prototype.define.call(m,{'text/b':['b']}));assert.equal(m.getType('b'),null);},
  'inspection maps are detached':mime=>{const m=new mime.Mime({'text/a':['a']})._freeze();m._getTestState().types.set('a','text/b');m._getTestState().extensions.set('text/a','b');assert.equal(m.getType('a'),'text/a');assert.equal(m.getExtension('text/a'),'a');},
 };
 // Wrap the default without altering the upstream singleton.
 const reference={Mime:(await import('./node_modules/mime/dist/src/index.js')).Mime};
 for(const [name,probe]of Object.entries(probes)){assert.throws(()=>probe(reference),assert.AssertionError,name+' upstream control');probe(vpm);}
 const source=(await import('./node_modules/mime/dist/types/standard.js')).default,copy=require('../../packages/vmime/types/standard');
 assert.equal(Object.isFrozen(source['text/plain']),false);assert.equal(Object.isFrozen(copy['text/plain']),true);
 assert.equal(upstream.getExtension('; charset=utf-8'),'');assert.equal(vpm.getExtension('; charset=utf-8'),null);
 console.log('Six mime discriminators verified against 4.1.2: atomic conflict/type failure, frozen prototype/state protection, frozen table arrays, empty Content-Type result.');
}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
