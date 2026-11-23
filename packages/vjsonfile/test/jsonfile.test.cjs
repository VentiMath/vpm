'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const json=require('../index.cjs'),{stringify,stripBom}=require('../utils.cjs');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vjsonfile-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return path.join(dir,'data.json');}
const callback=call=>new Promise((resolve,reject)=>call((err,value)=>err?reject(err):resolve(value)));

test('sync, Promise and callback operations round-trip and keep default final newline',async t=>{
  const file=fixture(t),value={name:'VentiMath',nested:[1,null,true,'é']};
  json.writeFileSync(file,value);assert.equal(fs.readFileSync(file,'utf8'),JSON.stringify(value)+'\n');
  assert.deepEqual(json.readFileSync(file),value);
  assert.equal(await json.writeFile(file,value),undefined);assert.deepEqual(await json.readFile(file),value);
  assert.equal(await callback(cb=>assert.equal(json.writeFile(file,value,cb),undefined)),undefined);
  assert.deepEqual(await callback(cb=>assert.equal(json.readFile(file,cb),undefined)),value);
});
test('encoding strings, UTF16 BOM, URL, Buffer paths and descriptors',async t=>{
  const file=fixture(t),value={text:'é'};
  await json.writeFile(file,value,'utf16le');assert.deepEqual(await json.readFile(file,'utf16le'),value);
  fs.writeFileSync(file,'\ufeff'+JSON.stringify(value),'utf16le');assert.deepEqual(json.readFileSync(file,'utf16le'),value);
  const url=require('node:url').pathToFileURL(file);await json.writeFile(url,value);assert.deepEqual(await json.readFile(url),value);
  assert.deepEqual(json.readFileSync(Buffer.from(file)),value);
  const fd=fs.openSync(file,'r');try{assert.deepEqual(json.readFileSync(fd),value)}finally{fs.closeSync(fd)}
});
test('literal EOL, replacers, finalEOL and tab indentation',()=>{
  const value={a:1,b:{c:2}},base=JSON.stringify(value,null,'\t');
  for(const EOL of ['\n','\r\n','','$&',"$'",'$`','$$'])for(const finalEOL of [true,false]){
    assert.equal(stringify(value,{spaces:'\t',EOL,finalEOL}),base.split('\n').join(EOL)+(finalEOL?EOL:''));
  }
  assert.equal(stringify(value,{replacer:['a'],finalEOL:false}),'{"a":1}');
  assert.equal(stringify(value,{replacer:(key,v)=>key==='a'?3:v}),'{"a":3,"b":{"c":2}}\n');
});
test('BOM removal respects buffer and byte-view boundaries, including other realms',()=>{
  const bytes=Buffer.from('xx\ufeff{"a":1}yy'),view=bytes.subarray(2,-2);
  for(const v of [view,new Uint8Array(view.buffer,view.byteOffset,view.byteLength),vm.runInNewContext('new Uint8Array([239,187,191,49])'),'\ufeff1'])assert.doesNotThrow(()=>JSON.parse(stripBom(v)));
  assert.equal(stripBom('\ufeff\ufeff1'),'\ufeff1');assert.throws(()=>stripBom(new Uint16Array([1])),TypeError);
});
test('serialization errors occur before any truncation or filesystem call',async t=>{
  const file=fixture(t),circular={};circular.self=circular;
  for(const value of [undefined,()=>{},Symbol('x'),1n,circular]){
    fs.writeFileSync(file,'keep');assert.throws(()=>json.writeFileSync(file,value),TypeError);
    await assert.rejects(json.writeFile(file,value),TypeError);
    await assert.rejects(callback(cb=>json.writeFile(file,value,cb)),TypeError);
    assert.equal(fs.readFileSync(file,'utf8'),'keep');
  }
  let opened=false;const io={writeFileSync(){opened=true},writeFile(){opened=true}};
  assert.throws(()=>json.writeFileSync(file,{}, {fs:io,replacer(){throw new Error('replacer')}}),/replacer/);
  await assert.rejects(json.writeFile(file,undefined,{fs:io}),TypeError);assert.equal(opened,false);
});
test('parse errors identify the file; throws:false keeps sync/async I/O distinction',async t=>{
  const file=fixture(t);fs.writeFileSync(file,'{');
  assert.throws(()=>json.readFileSync(file),e=>e instanceof SyntaxError&&e.message.startsWith(file+':'));
  await assert.rejects(json.readFile(file),e=>e instanceof SyntaxError&&e.message.startsWith(file+':'));
  assert.equal(json.readFileSync(file,{throws:false}),null);assert.equal(await json.readFile(file,{throws:false}),null);
  fs.unlinkSync(file);assert.equal(json.readFileSync(file,{throws:false}),null);
  await assert.rejects(json.readFile(file,{throws:false}),{code:'ENOENT'});
});
test('revivers retain identity, null suppression and inherited throws option',async t=>{
  const file=fixture(t);fs.writeFileSync(file,'{"date":"2026-11-23"}');
  assert.equal((await json.readFile(file,{reviver:(key,v)=>key==='date'?new Date(v):v})).date.toISOString(),'2026-11-23T00:00:00.000Z');
  for(const error of [Object.freeze(new Error('frozen')),Symbol('reviver'),null]){
    const options={reviver(){throw error}};
    assert.throws(()=>json.readFileSync(file,options),e=>e===error);
    await assert.rejects(json.readFile(file,options),e=>e===error);
    assert.equal(await json.readFile(file,Object.assign(Object.create({throws:false}),options)),null);
  }
});
test('injected filesystem methods keep their receiver and original options',async()=>{
  const io={text:'{"a":1}',readFile(file,options,done){assert.equal(options.fs,this);done(null,Buffer.from(this.text))},readFileSync(){return this.text},writeFile(file,text,options,done){assert.equal(options.fs,this);this.text=text;done(null)},writeFileSync(file,text){this.text=text;return 17}};
  assert.deepEqual(await json.readFile('memory',{fs:io}),{a:1});assert.deepEqual(json.readFileSync('memory',{fs:io}),{a:1});
  assert.equal(json.writeFileSync('memory',{a:2},{fs:io}),17);await json.writeFile('memory',{a:3},{fs:io});assert.equal(io.text,'{"a":3}\n');
});
test('duplicate callbacks settle once and synchronous injected errors reject',async()=>{
  let count=0;
  const io={readFile(file,options,cb){cb(null,'1');cb(new Error('late'))}};
  assert.equal(await callback(cb=>json.readFile('memory',{fs:io},(...args)=>{count++;cb(...args)})),1);assert.equal(count,1);
  await assert.rejects(json.writeFile('memory',{}, {fs:{writeFile(){throw new Error('sync')}}}),/sync/);
});
test('native write options retain exclusive creation, append and cancellation',async t=>{
  const file=fixture(t);json.writeFileSync(file,1,{flag:'wx',mode:0o600});
  await assert.rejects(json.writeFile(file,2,{flag:'wx'}),{code:'EEXIST'});
  await json.writeFile(file,2,{flag:'a'});assert.equal(fs.readFileSync(file,'utf8'),'1\n2\n');
  const controller=new AbortController();controller.abort();await assert.rejects(json.readFile(file,{signal:controller.signal}),{name:'AbortError'});
});
test('JSON prototype-like keys stay data',async()=>{
  const value=await json.readFile('memory',{fs:{readFile(file,options,cb){cb(null,'{"__proto__":{"polluted":true},"constructor":3}')}}});
  assert.equal(Object.getPrototypeOf(value),Object.prototype);assert.equal(Object.hasOwn(value,'__proto__'),true);assert.equal({}.polluted,undefined);
  assert.deepEqual(JSON.parse(stringify(value)),value);
});
