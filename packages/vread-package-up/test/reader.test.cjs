'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {execFileSync}=require('node:child_process');
const {fixture,loadWith}=require('./helpers.cjs');
const reader=require('..');
const {readPackageUp:read,readPackageUpSync:sync,PackageJsonError}=reader;
for(const [mode,read]of [['sync',sync],['async',reader.readPackageUp]]) {
  test(mode+': nearest manifest and returned absolute path',async t=>{
    const f=fixture(t);f.write(f.root,{name:'root'});f.write(path.dirname(f.nested),{name:'near',type:'module'});
    assert.deepEqual(await read({cwd:f.nested}),{packageJson:{name:'near',type:'module'},path:path.join(f.root,'a','package.json')});
  });
  test(mode+': raw metadata is preserved and calls return independent objects',async t=>{
    const f=fixture(t),data={version:' v1.0 ',repository:'owner/repo',custom:{a:1},bin:'run.js'};f.write(f.root,data);
    const a=await read({cwd:f.nested,normalize:false}),b=await read({cwd:f.nested});
    assert.deepEqual(a.packageJson,data);assert.deepEqual(a,b);assert.notEqual(a.packageJson,b.packageJson);a.packageJson.custom.a=9;
    assert.equal(b.packageJson.custom.a,1);assert.equal((await read({cwd:f.nested})).packageJson.custom.a,1);
  });
  test(mode+': inclusive stopAt and relative ancestor boundaries',async t=>{
    const f=fixture(t);f.write(f.root,{name:'root'});
    assert.equal(await read({cwd:f.nested,stopAt:'..'}),undefined);
    assert.equal((await read({cwd:f.nested,stopAt:'../..'})).packageJson.name,'root');
    f.write(f.nested,{name:'local'});assert.equal((await read({cwd:f.nested,stopAt:f.nested})).packageJson.name,'local');
  });
  test(mode+': missing directories and file-shaped cwd keep lexical parent search',async t=>{
    const f=fixture(t);f.write(f.root,{name:'root'});fs.writeFileSync(path.join(f.nested,'index.js'),'');
    for(const cwd of [path.join(f.nested,'missing','deeper'),path.join(f.nested,'index.js')])assert.equal((await read({cwd,stopAt:f.root})).packageJson.name,'root');
  });
  test(mode+': file URLs and literal percent/hash characters',async t=>{
    const f=fixture(t),directory=path.join(f.nested,'space % # café');fs.mkdirSync(directory);f.write(f.root,{name:'url'});
    assert.equal((await read({cwd:pathToFileURL(directory),stopAt:pathToFileURL(f.root)})).packageJson.name,'url');
  });
  test(mode+': absent manifest and package.json directories are skipped',async t=>{
    const f=fixture(t);fs.mkdirSync(path.join(f.nested,'package.json'));
    assert.equal(await read({cwd:f.nested,stopAt:f.root}),undefined);f.write(f.root,{});
    assert.equal((await read({cwd:f.nested,stopAt:f.root})).path,path.join(f.root,'package.json'));
  });
  test(mode+': malformed nearest file never falls back to an ancestor',async t=>{
    const f=fixture(t);f.write(f.root,{name:'parent'});f.write(f.nested,'{"secret":"do-not-echo" broken}');
    await assert.rejects(async()=>read({cwd:f.nested}),error=>{
      assert.ok(error instanceof PackageJsonError);assert.ok(error instanceof SyntaxError);
      assert.equal(error.path,path.join(f.nested,'package.json'));assert.equal(error.code,'ERR_INVALID_PACKAGE_JSON');
      assert.doesNotMatch(error.message,/do-not-echo/);assert.equal(error.cause,undefined);return true;
    });
  });
  test(mode+': package root must be an object',async t=>{
    const f=fixture(t);
    for(const value of ['null','[]','true','12','"text"','']){f.write(f.root,value);await assert.rejects(async()=>read({cwd:f.root}),PackageJsonError);}
  });
  test(mode+': BOM accepted, invalid UTF-8 rejected, JSON keys preserved safely',async t=>{
    const f=fixture(t);f.write(f.root,'\ufeff{"__proto__":{"polluted":true},"type":"module"}');
    const result=await read({cwd:f.root});assert.equal(Object.getPrototypeOf(result.packageJson),Object.prototype);
    assert.ok(Object.hasOwn(result.packageJson,'__proto__'));assert.equal({}.polluted,undefined);
    f.write(f.root,Buffer.from([123,34,120,34,58,34,255,34,125]));await assert.rejects(async()=>read({cwd:f.root}),/Invalid UTF-8/);
  });
  test(mode+': filesystem updates are visible without invalidation',async t=>{
    const f=fixture(t);f.write(f.root,{name:'parent'});assert.equal((await read({cwd:f.nested})).packageJson.name,'parent');
    f.write(f.nested,{name:'child'});assert.equal((await read({cwd:f.nested})).packageJson.name,'child');
    f.write(f.nested,{name:'changed'});assert.equal((await read({cwd:f.nested})).packageJson.name,'changed');
    fs.unlinkSync(path.join(f.nested,'package.json'));assert.equal((await read({cwd:f.nested})).packageJson.name,'parent');
  });
  test(mode+': single-read own options and frozen configuration',async t=>{
    const f=fixture(t);f.write(f.root,{});const reads={};const values={cwd:f.nested,stopAt:f.root,normalize:false,type:'file'};
    const options={};for(const key of Object.keys(values))Object.defineProperty(options,key,{get(){reads[key]=(reads[key]||0)+1;return values[key];}});
    assert.ok(await read(Object.freeze(options)));assert.deepEqual(Object.values(reads),[1,1,1,1]);
    const inherited=Object.create({normalize:true,type:'directory'});inherited.cwd=f.root;assert.ok(await read(inherited));
  });
  test(mode+': invalid config fails before filesystem work or value coercion',async t=>{
    const f=fixture(t);let coercions=0;const evil={toString(){coercions++;return f.root;}};
    for(const options of [true,[],{normalize:true},{normalize:0},{type:'directory'},{cwd:evil},{cwd:1},{cwd:'x\0y'},{cwd:new URL('https://example.test')},{cwd:f.root,stopAt:path.join(f.root,'child')},{cwd:f.nested,stopAt:path.join(f.root,'sibling')}])await assert.rejects(async()=>read(options),TypeError);
    assert.equal(coercions,0);
  });
  test(mode+': symlink manifests keep the searched path, broken links are skipped',async t=>{
    const f=fixture(t);f.write(f.root,{name:'parent'});fs.writeFileSync(path.join(f.root,'other.json'),'{"name":"linked"}');
    const file=path.join(f.nested,'package.json');fs.symlinkSync(path.join(f.root,'other.json'),file);
    const result=await read({cwd:f.nested});assert.equal(result.packageJson.name,'linked');assert.equal(result.path,file);
    fs.unlinkSync(file);fs.symlinkSync(path.join(f.root,'missing.json'),file);assert.equal((await read({cwd:f.nested})).packageJson.name,'parent');
  });
  test(mode+': symlink loops are surfaced instead of hidden',async t=>{
    const f=fixture(t);f.write(f.root,{name:'parent'});fs.symlinkSync('package.json',path.join(f.nested,'package.json'));
    await assert.rejects(async()=>read({cwd:f.nested}),error=>error.code==='ELOOP');
  });
  test(mode+': nonregular files are skipped without blocking', {skip:process.platform==='win32'},async t=>{
    const f=fixture(t);f.write(f.root,{name:'parent'});const file=path.join(f.nested,'package.json');
    execFileSync('mkfifo',[file]);assert.equal((await read({cwd:f.nested})).packageJson.name,'parent');
    fs.unlinkSync(file);fs.symlinkSync('/dev/zero',file);assert.equal((await read({cwd:f.nested})).packageJson.name,'parent');
  });
}
test('async configuration is captured before the promise is returned',async t=>{
  const f=fixture(t);f.write(f.root,{});const options={cwd:f.root,normalize:false};const pending=read(options);options.cwd='/does-not-exist';options.normalize=true;
  assert.equal((await pending).path,path.join(f.root,'package.json'));
});
test('async calls settle by rejection for invalid options',async()=>{
  let promise;assert.doesNotThrow(()=>{promise=read({normalize:true});});assert.ok(promise instanceof Promise);await assert.rejects(promise,TypeError);
});
test('open permission and I/O failures propagate without walking upward',async()=>{
  for(const code of ['EACCES','EIO','EMFILE']) {
    const error=Object.assign(new Error(code),{code});let calls=0;
    const testReader=loadWith({open(_path,_flags,callback){calls++;callback(error);},statSync(){calls++;throw error;}});
    assert.throws(()=>testReader.readPackageUpSync({cwd:'/one/two'}),e=>e===error);
    await assert.rejects(testReader.readPackageUp({cwd:'/one/two'}),e=>e===error);assert.equal(calls,2);
  }
});
test('opened descriptors close on stat/read failures and keep the original error',async()=>{
  for(const operation of ['fstat','readFile']){
    const failure=new Error(operation),closeFailure=new Error('close');let closed=0;
    const fake={open(_p,_flags,cb){cb(null,7);},fstat(_fd,cb){cb(null,{isFile:()=>true});},readFile(_fd,cb){cb(null,Buffer.from('{}'));},close(fd,cb){assert.equal(fd,7);closed++;cb(closeFailure);}};
    fake[operation]=(_fd,cb)=>cb(failure);const testReader=loadWith(fake);
    await assert.rejects(testReader.readPackageUp(),e=>e===failure);assert.equal(closed,1);
  }
});
test('close failures surface on otherwise successful reads',async()=>{
  const failure=new Error('close');let closed=0;
  const testReader=loadWith({open(_p,_flags,cb){cb(null,7);},fstat(_fd,cb){cb(null,{isFile:()=>true});},readFile(_fd,cb){cb(null,Buffer.from('{}'));},close(_fd,cb){closed++;cb(failure);}});
  await assert.rejects(testReader.readPackageUp(),e=>e===failure);assert.equal(closed,1);
});
test('sync descriptor cleanup and errors survive path replacement',()=>{
  let closes=0,reads=0;const failure=new Error('read');
  const testReader=loadWith({statSync(){return {isFile:()=>true};},openSync(){return 7;},fstatSync(){return {isFile:()=>false};},closeSync(){closes++;},readFileSync(){reads++;throw failure;}});
  assert.equal(testReader.readPackageUpSync({cwd:'/one',stopAt:'/one'}),undefined);assert.equal(reads,0);assert.equal(closes,1);
  const broken=loadWith({statSync(){return {isFile:()=>true};},openSync(){return 8;},fstatSync(){throw failure;},closeSync(){closes++;throw new Error('close');}});
  assert.throws(()=>broken.readPackageUpSync(),e=>e===failure);assert.equal(closes,2);
});
test('descriptor remains the read target after opening',async t=>{
  const f=fixture(t);f.write(f.root,{name:'opened'});let closes=0;
  const testReader=loadWith({open(file,flags,cb){fs.open(file,flags,(error,fd)=>{if(!error){fs.renameSync(file,file+'.old');fs.writeFileSync(file,'{"name":"new"}');}cb(error,fd);});},close(fd,cb){closes++;fs.close(fd,cb);}});
  assert.equal((await testReader.readPackageUp({cwd:f.root})).packageJson.name,'opened');assert.equal(closes,1);
});
test('CJS and ESM expose matching functions and error class',async()=>{
  const esm=await import('../index.js');assert.equal(esm.readPackageUp,read);assert.equal(esm.readPackageUpSync,sync);assert.equal(esm.PackageJsonError,PackageJsonError);assert.ok(Object.isFrozen(reader));
});
test('upstream source and tests retain verified hashes',()=>{
  for(const [file,hash]of Object.entries(require('../PROVENANCE.json').sha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),hash,file);
});
test('parse failures happen after descriptor cleanup',async()=>{
  let closes=0;
  const testReader=loadWith({open(_p,_f,cb){cb(null,7);},fstat(_fd,cb){cb(null,{isFile:()=>true});},readFile(_fd,cb){cb(null,Buffer.from('{broken'));},close(_fd,cb){closes++;cb(null);}});
  await assert.rejects(testReader.readPackageUp(),SyntaxError);assert.equal(closes,1);
});
test('concurrent async reads return distinct complete large manifests',async t=>{
  const f=fixture(t),data={type:'module',text:'雪☃'.repeat(40000),custom:Array.from({length:100},(_,i)=>({index:i}))};f.write(f.root,data);
  const results=await Promise.all(Array.from({length:16},()=>read({cwd:f.nested})));
  for(const result of results)assert.deepEqual(result.packageJson,data);
  for(let i=1;i<results.length;i++)assert.notEqual(results[i].packageJson,results[0].packageJson);
});
for(const mode of ['sync','async'])test(mode+': Windows boundary casing and drive roots terminate at the inclusive ancestor',async()=>{
  const attempts=[];
  const testReader=loadWith({statSync(file){attempts.push(file);return undefined;},open(file,_flags,cb){attempts.push(file);assert.ok(attempts.length<10,'search must terminate');cb(Object.assign(new Error('missing'),{code:'ENOENT'}));}},path.win32);
  const read=mode==='sync'?testReader.readPackageUpSync:testReader.readPackageUp;
  assert.equal(await read({cwd:'C:\\Work\\Child',stopAt:'c:\\work'}),undefined);
  assert.deepEqual(attempts,['C:\\Work\\Child\\package.json','C:\\Work\\package.json']);
  attempts.length=0;
  assert.equal(await read({cwd:'C:\\Work',stopAt:'c:\\work'}),undefined);
  assert.deepEqual(attempts,['C:\\Work\\package.json']);
  attempts.length=0;
  assert.equal(await read({cwd:'C:\\Work',stopAt:'c:\\'}),undefined);
  assert.deepEqual(attempts,['C:\\Work\\package.json','C:\\package.json']);
  await assert.rejects(async()=>read({cwd:'C:\\Work',stopAt:'D:\\'}),TypeError);
});
test('async success and parse errors wait for descriptor closure',async()=>{
  for(const source of ['{}','{broken',' '.repeat(5000)+'{}',' '.repeat(5000)+'{broken']){
    let release,settled=false;
    const testReader=loadWith({open(_p,_f,cb){cb(null,7);},fstat(_fd,cb){cb(null,{isFile:()=>true});},readFile(_fd,cb){cb(null,Buffer.from(source));},close(_fd,cb){release=cb;}});
    const pending=testReader.readPackageUp().then(result=>{settled=true;return {result};},error=>{settled=true;return {error};});
    await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
    release(null);const outcome=await pending;
    if(source.endsWith('{}'))assert.deepEqual(outcome.result.packageJson,{});else assert.equal(outcome.error.code,'ERR_INVALID_PACKAGE_JSON');
  }
});
test('close failure wins over a concurrently prepared parse error',async()=>{
  let release;const failure=new Error('close');
  const testReader=loadWith({open(_p,_f,cb){cb(null,7);},fstat(_fd,cb){cb(null,{isFile:()=>true});},readFile(_fd,cb){cb(null,Buffer.from(' '.repeat(5000)+'{broken'));},close(_fd,cb){release=cb;}});
  const pending=testReader.readPackageUp();release(failure);await assert.rejects(pending,e=>e===failure);
});
for(const [mode,read]of [['sync',sync],['async',reader.readPackageUp]])test(mode+': strict decoding recovers after invalid sequences and strips exactly one BOM',async t=>{
  const f=fixture(t);
  for(const padding of ['', ' '.repeat(5000)])for(const invalid of [[0xc0,0xaf],[0xe2,0x82],[0xed,0xa0,0x80],[0xf4,0x90,0x80,0x80],[0x80]]){
    f.write(f.root,Buffer.concat([Buffer.from(padding+'{"x":"'),Buffer.from(invalid),Buffer.from('"}')]));
    await assert.rejects(async()=>read({cwd:f.root}),/Invalid UTF-8/);
    f.write(f.root,'\ufeff'+padding+'{"x":"雪😀"}');assert.deepEqual((await read({cwd:f.root})).packageJson,{x:'雪😀'});
  }
  f.write(f.root,'\ufeff\ufeff'+' '.repeat(5000)+'{}');await assert.rejects(async()=>read({cwd:f.root}),/Invalid JSON/);
});
