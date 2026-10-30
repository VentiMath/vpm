'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),mime=require('..'),{Mime}=mime;
test('current upstream suite and independent correctness discriminators',async()=>{await require('../../../scripts/mime-conformance/run.cjs')();await require('../../../scripts/mime-conformance/regressions.cjs')();});
test('full and lite data match every upstream extension, MIME type and preference',async()=>{
 for(const name of ['standard','other'])assert.deepEqual(require('../types/'+name),(await import('../../../scripts/mime-conformance/node_modules/mime/dist/types/'+name+'.js')).default);
 for(const lite of [false,true]){
  const reference=(await import('../../../scripts/mime-conformance/node_modules/mime/dist/src/'+(lite?'index_lite.js':'index.js'))).default,target=lite?require('../lite'):mime;
  const tables=[require('../types/standard'),...(lite?[]:[require('../types/other')])];
  for(const table of tables)for(const [type,extensions]of Object.entries(table)){
   assert.equal(target.getExtension(type),reference.getExtension(type),type);
   assert.deepEqual([...target.getAllExtensions(type)],[...reference.getAllExtensions(type)],type);
   for(const ext of extensions.map(e=>e.replace(/^\*/,'')))for(const p of [ext,'.'+ext,'dir/a.'+ext,'C:\\dir\\a.'+ext.toUpperCase(),'dir/.'+ext,ext+'?query'])assert.equal(target.getType(p),reference.getType(p),p);
  }
 }
});
test('seeded mixed path and Content-Type inputs agree with mime 4',async()=>{
 const ref=(await import('../../../scripts/mime-conformance/node_modules/mime/dist/src/index.js')).default;
 let seed=417;const alphabet='ab./\\\n\r\u2028xTXT ';
 for(let n=0;n<5000;n++){let p='';for(let i=0;i<n%37;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;p+=alphabet[seed%alphabet.length];}if(n%2)p+='.TXT';assert.equal(mime.getType(p),ref.getType(p),p);}
 for(const x of ['text/plain',' TEXT/PLAIN ; charset=utf-8','text/plain\t',';','',null,42,{},undefined]){assert.equal(mime.getExtension(x),ref.getExtension(x)||null);assert.deepEqual(mime.getAllExtensions(x),ref.getAllExtensions(x));}
});
test('custom definitions preserve stars, overwrite preferences, empty lists and own keys',()=>{
 const map=Object.assign(Object.create({'text/inherited':['bad']}),{'TEXT/A':['*B','A']});
 const m=new Mime(map,{'text/b':['b'],'text/empty':[]});assert.equal(m.getType('bad'),null);assert.equal(m.getType('b'),'text/b');assert.equal(m.getExtension('text/a'),'b');assert.deepEqual(m.getAllExtensions('text/empty'),new Set());assert.equal(m.getExtension('text/empty'),null);
 assert.equal(m.define({'text/a':['a1']}),m);assert.equal(m.getExtension('text/a'),'a1');assert.deepEqual(m.getAllExtensions('text/a'),new Set(['b','a','a1']));
 m.define({'text/c':['b']},true);assert.equal(m.getType('b'),'text/c');assert.equal(m.getExtension('text/b'),'b');
 assert.throws(()=>m.define({'text/d':['d'],'text/e':['d']}));assert.equal(m.getType('d'),null);
});
test('prototype-sensitive names stay ordinary mapping keys',()=>{
 const m=new Mime(JSON.parse('{"__proto__":["__proto__"],"constructor":["constructor"],"text/a":["toString"]}'));
 assert.equal(m.getType('__proto__'),'__proto__');assert.equal(m.getExtension('__proto__'),'__proto__');assert.equal(m.getType('constructor'),'constructor');assert.equal(m.getType('toString'),'text/a');assert.equal(mime.getType('__proto__'),null);
});
test('failed validation and getters do not partially apply a definition',()=>{
 for(const map of [null,[],42,{'text/a':['a'],'text/b':null},{'text/a':['a'],'text/b':[,'b']},Object.defineProperty({'text/a':['a']},'text/b',{enumerable:true,get(){throw new Error('getter');}})]){
  const m=new Mime();assert.throws(()=>m.define(map));assert.equal(m.getType('a'),null);
 }
 const m=new Mime();assert.throws(()=>m.define({'text/a':['a']},'yes'));assert.equal(m.getType('a'),null);
});
test('CJS and ESM share instances/classes; full and lite coexist',async()=>{
 const esm=await import('../index.mjs'),lite=await import('../lite.mjs');assert.equal(esm.default,mime);assert.equal(esm.Mime,Mime);assert.equal(lite.default,require('../lite'));assert.equal(lite.Mime,Mime);assert.equal(lite.default.getType('docx'),null);assert.equal(mime.getType('docx'),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');assert(Object.isFrozen(mime));
});

test('freezing from an input getter blocks the pending commit',()=>{
 const m=new Mime();const map=Object.defineProperty({},'text/a',{enumerable:true,get(){m._freeze();return ['a'];}});assert.throws(()=>m.define(map),/define\(\) not allowed/);assert.equal(m.getType('a'),null);
});
test('CLI flags, missing input and unknown extensions have stable exits',()=>{
 const {spawnSync}=require('node:child_process'),path=require('node:path');
 for(const [args,status,expected]of [[['--name'],0,'vmime\n'],[['--version'],0,'0.1.0\n'],[[],1,''],[['unknown-extension'],1,''],[['--reverse','unknown/type'],1,'']]){const r=spawnSync(process.execPath,[path.resolve(__dirname,'../bin/vmime.cjs'),...args],{encoding:'utf8'});assert.equal(r.status,status);assert.equal(r.stdout,expected);assert.equal(r.stderr,'');}
});
test('version 3 migration records every added, changed and removed extension',()=>{
 const legacy=require('../../../scripts/mime-conformance/node_modules/mime-legacy');
 assert.equal(require('../../../scripts/mime-conformance/node_modules/mime-legacy/package.json').version,'3.0.0');
 const all=[...new Set([...Object.keys(legacy._types),...mime._getTestState().types.keys()])].sort();
 const changes=all.flatMap(extension=>legacy.getType(extension)===mime.getType(extension)?[]:[{extension,before:legacy.getType(extension),after:mime.getType(extension)}]);
 assert.deepEqual(changes,require('../../../scripts/mime-conformance/migration.json').changes);
 assert.equal(changes.filter(x=>x.before&&x.after).length,11);assert.equal(changes.filter(x=>!x.before).length,69);assert.equal(changes.filter(x=>!x.after).length,2);
});
