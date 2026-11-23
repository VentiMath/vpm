'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const io=require('../index.cjs');
function fixture(t){const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vfs-extra-')));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
const cb=call=>new Promise((resolve,reject)=>call((err,value)=>err?reject(err):resolve(value)));
for(const sync of [false,true]){
  const run=(name,...args)=>sync?io[name+'Sync'](...args):io[name](...args);
  test(`${sync?'sync':'async'} creates output parents, preserves JSON and existing files`,async t=>{
    const dir=fixture(t),file=dir+'/nested/config.json';
    await run('outputJson',file,{appId:'demo',plugins:['A']},{spaces:'\t'});
    assert.equal(fs.readFileSync(file,'utf8'),'{\n\t"appId": "demo",\n\t"plugins": [\n\t\t"A"\n\t]\n}\n');
    await run('ensureFile',file);assert.equal(io.readJSONSync(file).appId,'demo');
    await run('ensureFile',dir+'/new/deep/empty');assert.equal(fs.statSync(dir+'/new/deep/empty').size,0);
    await run('outputFile',dir+'/notes/text','hello');assert.equal(fs.readFileSync(dir+'/notes/text','utf8'),'hello');
    await assert.rejects(async()=>run('outputJson',dir+'/no-create/bad.json',1n),TypeError);assert(!fs.existsSync(dir+'/no-create'));
    await assert.rejects(async()=>run('ensureDir',file),{code:'EEXIST'});
  });
  test(`${sync?'sync':'async'} copy preserves modes, timestamps, relative and dangling links`,async t=>{
    const dir=fixture(t),src=dir+'/source',dest=dir+'/deep/destination';fs.mkdirSync(src);fs.writeFileSync(src+'/file','bytes',{mode:0o640});
    fs.utimesSync(src+'/file',1000,1000);fs.symlinkSync('file',src+'/link');fs.symlinkSync('absent',src+'/broken');
    await run('copy',src,dest,{preserveTimestamps:true});assert.equal(fs.readFileSync(dest+'/file','utf8'),'bytes');
    assert.equal(fs.statSync(dest+'/file').mode&0o777,0o640);assert.equal(fs.statSync(dest+'/file').mtimeMs,1000000);
    assert.equal(fs.readlinkSync(dest+'/link'),'file');assert.equal(fs.readlinkSync(dest+'/broken'),'absent');
    await run('copy',src+'/link',dir+'/dereferenced',{dereference:true});assert.equal(fs.lstatSync(dir+'/dereferenced').isFile(),true);
  });
  test(`${sync?'sync':'async'} copy filters, overwrite flags and symlink destinations`,async t=>{
    const dir=fixture(t);fs.mkdirSync(dir+'/src');fs.writeFileSync(dir+'/src/keep','new');fs.writeFileSync(dir+'/src/skip','skip');
    const opts=Object.freeze({filter:(src)=>!src.endsWith('skip')});await run('copy',dir+'/src',dir+'/dest',opts);assert(!fs.existsSync(dir+'/dest/skip'));
    fs.writeFileSync(dir+'/dest/keep','old');await run('copy',dir+'/src/keep',dir+'/dest/keep',{overwrite:false});assert.equal(fs.readFileSync(dir+'/dest/keep','utf8'),'old');
    await assert.rejects(async()=>run('copy',dir+'/src/keep',dir+'/dest/keep',{overwrite:false,errorOnExist:true}),{code:'EEXIST'});
    fs.writeFileSync(dir+'/outside','outside');fs.symlinkSync('../outside',dir+'/dest/link');
    await run('copy',dir+'/src/keep',dir+'/dest/link',{dereference:true});assert.equal(fs.readFileSync(dir+'/outside','utf8'),'outside');assert.equal(fs.lstatSync(dir+'/dest/link').isFile(),true);
    fs.symlinkSync('absent-outside',dir+'/dangling');await run('copy',dir+'/src/keep',dir+'/dangling',{dereference:true});assert(!fs.existsSync(dir+'/absent-outside'));assert.equal(fs.readFileSync(dir+'/dangling','utf8'),'new');
  });
  test(`${sync?'sync':'async'} rejects same files and overlapping trees before modifying them`,async t=>{
    const dir=fixture(t);fs.mkdirSync(dir+'/src');fs.writeFileSync(dir+'/src/keep','keep');fs.linkSync(dir+'/src/keep',dir+'/hard');fs.symlinkSync('src',dir+'/alias');
    for(const [a,b] of [[dir+'/src/keep',dir+'/hard'],[dir+'/src',dir+'/src/nested'],[dir+'/src',dir+'/alias/missing/deep'],[dir+'/src',dir]])for(const method of ['copy','move']){
      await assert.rejects(async()=>run(method,a,b,{overwrite:true}),/same|overlap|subdirectory/);assert.equal(fs.readFileSync(dir+'/src/keep','utf8'),'keep');
    }
    assert(!fs.existsSync(dir+'/src/nested'));assert(!fs.existsSync(dir+'/src/missing'));assert.equal(fs.readFileSync(dir+'/hard','utf8'),'keep');
    fs.symlinkSync('src/keep',dir+'/source-link');for(const method of ['copy','move'])await assert.rejects(async()=>run(method,dir+'/source-link',dir+'/src/keep',{overwrite:true}));assert.equal(fs.readFileSync(dir+'/src/keep','utf8'),'keep');
  });
  test(`${sync?'sync':'async'} directory-link cycles reject and removal leaves link targets intact`,async t=>{
    const dir=fixture(t);fs.mkdirSync(dir+'/src');fs.writeFileSync(dir+'/src/keep','keep');fs.symlinkSync('.',dir+'/src/cycle');
    await assert.rejects(async()=>run('copy',dir+'/src',dir+'/dest',{dereference:true}),{code:'ELOOP'});
    await run('remove',dir+'/src/cycle');assert.equal(fs.readFileSync(dir+'/src/keep','utf8'),'keep');
    await run('remove',dir+'/missing');await run('emptyDir',dir+'/src');assert.deepEqual(fs.readdirSync(dir+'/src'),[]);
    await run('emptyDir',dir+'/new/empty');assert.deepEqual(fs.readdirSync(dir+'/new/empty'),[]);
    await assert.rejects(async()=>run('remove',path.parse(dir).root),/filesystem root/);
    fs.symlinkSync(path.parse(dir).root,dir+'/root-link');await assert.rejects(async()=>run('emptyDir',dir+'/root-link'),/filesystem root/);
    fs.writeFileSync(dir+'/file','keep');await assert.rejects(async()=>run('emptyDir',dir+'/file'),{code:'ENOTDIR'});assert.equal(fs.readFileSync(dir+'/file','utf8'),'keep');
  });
  test(`${sync?'sync':'async'} moves retain content, create parents and do not clobber by default`,async t=>{
    const dir=fixture(t);fs.mkdirSync(dir+'/source');fs.writeFileSync(dir+'/source/a','new');fs.mkdirSync(dir+'/dest');fs.writeFileSync(dir+'/dest/a','old');
    await assert.rejects(async()=>run('move',dir+'/source',dir+'/dest'),{code:'EEXIST'});assert.equal(fs.readFileSync(dir+'/dest/a','utf8'),'old');
    await run('move',dir+'/source',dir+'/dest',{overwrite:true});assert.equal(fs.readFileSync(dir+'/dest/a','utf8'),'new');assert(!fs.existsSync(dir+'/source'));
    await run('move',dir+'/dest/a',dir+'/nested/new');assert.equal(fs.readFileSync(dir+'/nested/new','utf8'),'new');
  });
  test(`${sync?'sync':'async'} link helpers are idempotent and refuse replacing another target`,async t=>{
    const dir=fixture(t);fs.writeFileSync(dir+'/source','one');fs.writeFileSync(dir+'/other','two');
    await run('ensureLink',dir+'/source',dir+'/deep/hard');await run('ensureLink',dir+'/source',dir+'/deep/hard');assert.equal(fs.statSync(dir+'/source').ino,fs.statSync(dir+'/deep/hard').ino);
    await run('ensureSymlink','../source',dir+'/deep/link');await run('ensureSymlink','../source',dir+'/deep/link');assert.equal(fs.readlinkSync(dir+'/deep/link'),'../source');
    await assert.rejects(async()=>run('ensureLink',dir+'/other',dir+'/deep/hard'),{code:'EEXIST'});
    await assert.rejects(async()=>run('ensureSymlink',dir+'/other',dir+'/deep/link'),{code:'EEXIST'});
  });
}
test('callbacks, numeric descriptors and multi-result operations retain native contracts',async t=>{
  const dir=fixture(t);await cb(done=>io.outputFile(dir+'/file','hello',done));
  assert.equal(await cb(done=>io.pathExists(dir+'/file',done)),true);assert.equal(await io.pathExists(dir+'/missing'),false);
  const fd=await io.open(dir+'/file','r+');assert.equal(typeof fd,'number');
  try{const buffer=Buffer.alloc(5);const read=await io.read(fd,buffer,0,5,0);assert.equal(read.buffer,buffer);assert.equal(read.bytesRead,5);assert.equal(buffer.toString(),'hello');
    const write=await io.write(fd,'X',0,'utf8');assert.equal(write.bytesWritten,1);
    const vectors=await io.readv(fd,[Buffer.alloc(1)],0);assert.equal(vectors.buffers[0].toString(),'X');
    const written=await io.writev(fd,[Buffer.from('Y')],0);assert.equal(written.bytesWritten,1);
  }finally{await io.close(fd)}
  assert.equal(await cb(done=>io.readFile(dir+'/file','utf8',done)),'Yello');
  assert.equal(await io.exists(dir+'/file'),true);assert.equal(await new Promise(resolve=>io.exists(dir+'/missing',resolve)),false);
});
test('async copy filter is awaited; sync Promise filter rejects without traversing',async t=>{
  const dir=fixture(t);fs.mkdirSync(dir+'/src');fs.writeFileSync(dir+'/src/a','a');
  await io.copy(dir+'/src',dir+'/a',{filter:async src=>src===dir+'/src'});assert.deepEqual(fs.readdirSync(dir+'/a'),[]);
  assert.throws(()=>io.copySync(dir+'/src',dir+'/b',{filter:async()=>true}),/async filter/);assert(!fs.existsSync(dir+'/b'));
});
test('EXDEV fallback removes source only after a successful copy',async t=>{
  const dir=fixture(t),moduleDir=path.resolve(__dirname,'..'),cache=new Map();let failCopy=false;
  const native={...fs,rename(...args){args.at(-1)(Object.assign(new Error('cross-device'),{code:'EXDEV'}))},renameSync(){throw Object.assign(new Error('cross-device'),{code:'EXDEV'})},copyFile(...args){if(failCopy)args.at(-1)(Object.assign(new Error('copy failed'),{code:'EIO'}));else fs.copyFile(...args)},copyFileSync(...args){if(failCopy)throw Object.assign(new Error('copy failed'),{code:'EIO'});return fs.copyFileSync(...args)}};
  function load(file){if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);vm.runInThisContext('(function(require,module,exports){'+fs.readFileSync(file,'utf8')+'\n})',{filename:file})(name=>name==='node:fs'?native:name.startsWith('./')?load(path.resolve(path.dirname(file),name)):require(name),mod,mod.exports);return mod.exports}
  const injected=load(moduleDir+'/index.cjs');
  for(const sync of [false,true]){const run=(a,b)=>sync?injected.moveSync(a,b):injected.move(a,b);fs.writeFileSync(dir+'/source','keep');failCopy=true;await assert.rejects(async()=>run(dir+'/source',dir+'/dest'),{code:'EIO'});assert.equal(fs.readFileSync(dir+'/source','utf8'),'keep');failCopy=false;await run(dir+'/source',dir+'/dest');assert(!fs.existsSync(dir+'/source'));assert.equal(fs.readFileSync(dir+'/dest','utf8'),'keep');fs.unlinkSync(dir+'/dest')}
});
test('a filter replacing the source with a link cannot destroy the destination',async t=>{
  const dir=fixture(t);
  for(const sync of [false,true]){
    const src=dir+'/source-'+sync,dest=dir+'/dest-'+sync;fs.writeFileSync(src,'source');fs.writeFileSync(dest,'keep');
    const filter=()=>{fs.unlinkSync(src);fs.symlinkSync(dest,src);return true};
    await assert.rejects(async()=>sync?io.copySync(src,dest,{filter}):io.copy(src,dest,{filter}));
    assert.equal(fs.readFileSync(dest,'utf8'),'keep');
  }
});
test('UTF8 byte paths and file URLs work through convenience helpers',async t=>{
  const dir=fixture(t),file=dir+'/é.txt',bytes=new Uint8Array(Buffer.from(file));
  await io.outputFile(bytes,'bytes');assert.equal(await io.readFile(bytes,'utf8'),'bytes');
  const url=require('node:url').pathToFileURL(file);await io.copy(url,Buffer.from(dir+'/copy'));assert.equal(io.readFileSync(dir+'/copy','utf8'),'bytes');
});
