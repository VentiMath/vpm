'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const api = require('..');
function tree(t) {
  const cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vpath-')));
  fs.mkdirSync(cwd+'/dir/deep',{recursive:true}); fs.writeFileSync(cwd+'/dir/deep/a.ts','abc'); fs.writeFileSync(cwd+'/plain.txt','four');
  fs.symlinkSync('dir',cwd+'/link'); fs.symlinkSync('../..',cwd+'/dir/deep/loop'); fs.symlinkSync('absent',cwd+'/broken');
  t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));return cwd;
}
test('provisional identities, canonical case and Unicode survive directory promotion', t=>{
  const cwd=tree(t);fs.writeFileSync(cwd+'/Écho','x');
  const s=new api.PathScurry(cwd,{nocase:true});const a=s.cwd.resolve('e\u0301CHO'), missing=s.cwd.resolve('missing'), real=s.cwd.resolve('DIR/deep/a.ts');
  s.readdirSync(); assert.equal(s.cwd.resolve('Écho'),a);assert(a.isFile());assert(missing.isENOENT());assert.equal(real,s.cwd.resolve('dir/deep/a.ts'));
  assert.equal(a.fullpath(),cwd+'/'+fs.readdirSync(cwd).find(x=>x.normalize('NFC')==='Écho'));
  assert.equal(s.cwd.children().provisional,5);assert.equal(s.readdirSync({withFileTypes:false}).length,5);
});
test('cached directory read coalesces callbacks and preserves requested callback timing',async t=>{
  const cwd=tree(t);let calls=0; const s=new api.PathScurry(cwd,{fs:{readdir(...args){calls++;fs.readdir(...args);}}});
  const cb=new Promise(resolve=>s.cwd.readdirCB((err,rows)=>{assert.equal(err,null);resolve(rows);}));
  const [a,b,c]=await Promise.all([s.readdir(),s.readdir(),cb]);assert.deepEqual(a,b);assert.deepEqual(a,c);assert.equal(calls,1);
  let sync=true, observed; s.cwd.readdirCB(()=>{observed=sync;});sync=false;await Promise.resolve();assert.equal(observed,false);
  s.cwd.readdirCB(()=>{observed=true;},true);assert.equal(observed,true);
});
test('stat refreshes, cached access is explicit, missing entries do not trigger reads',async t=>{
  const cwd=tree(t),s=new api.PathScurry(cwd);const n=s.cwd.resolve('plain.txt');assert.equal(n.lstatCached(),undefined);assert.equal(n.lstatSync().size,4);
  fs.appendFileSync(n.fullpath(),'more');assert.equal(n.lstatCached().size,4);assert.equal((await n.lstat()).size,8);
  assert(n.isFile());assert.equal(n.parentPath,cwd);assert.deepEqual(await n.readdir(),[]);
  const m=s.cwd.resolve('absent');assert.equal(await m.lstat(),undefined);assert(m.isENOENT());assert.deepEqual(m.readdirSync(),[]);
});
test('walk APIs agree, filters do not prune descent, follow terminates cycles',async t=>{
  const cwd=tree(t),s=new api.PathScurry(cwd); const norm=a=>a.map(x=>typeof x==='string'?x:x.fullpath()).sort();
  const expected=norm(s.walkSync()); assert.deepEqual(norm(await s.walk()),expected);assert.deepEqual(norm(await s.stream().collect()),expected);assert.deepEqual(norm(await s.streamSync().collect()),expected);
  const only=s.walkSync({filter:p=>p.name.endsWith('.ts')});assert.equal(only.length,1);
  assert(!s.walkSync({walkFilter:p=>p.name!=='dir'}).some(p=>p.name==='a.ts'));
  assert(s.walkSync({follow:true}).length<20);assert((await s.walk({follow:true})).length<20);
});
test('stream backpressure pauses traversal and destroying releases work',async t=>{
  const cwd=tree(t);let calls=0;const s=new api.PathScurry(cwd,{fs:{readdir(...args){calls++;fs.readdir(...args);}}});
  const stream=s.stream();await new Promise(r=>setImmediate(r));assert.equal(calls,0);assert.equal(stream.bufferLength,1);stream.destroy();await new Promise(r=>setImmediate(r));assert.equal(calls,0);
  const rows=[];for await(const n of new api.PathScurry(cwd).stream()){rows.push(n.name);await new Promise(r=>setImmediate(r));}assert(rows.includes('a.ts'));
});
test('nested symlinks resolve relative link targets against canonical parent',async t=>{
  const cwd=tree(t);fs.symlinkSync('deep',cwd+'/dir/inner');const s=new api.PathScurry(cwd);assert.equal(s.readlinkSync('link/inner'),cwd+'/dir/deep');assert.equal(await s.readlink('link/inner'),cwd+'/dir/deep');assert.equal(await s.realpath('link/deep/a.ts'),cwd+'/dir/deep/a.ts');
});
test('chdir and URL cwd retain node identity and update relative paths', t=>{
  const cwd=tree(t),s=new api.PathScurry(pathToFileURL(cwd));const old=s.cwd,n=old.resolve('dir');s.chdir(n);assert.equal(s.cwd,n);assert.equal(n.relative(),'');assert.equal(old.isCWD,false);assert.equal(s.resolve('deep'),cwd+'/dir/deep');assert.equal(s.relative(old),'..');assert.equal(s.cwd.resolve('..'),old);
});
test('bounded children cache evicts directory observations and permits a fresh read',t=>{
  const cwd=tree(t),s=new api.PathScurry(cwd,{childrenCacheSize:8});s.readdirSync();s.cwd.resolve('dir').readdirSync();s.cwd.resolve('dir/deep').readdirSync();assert(s.cwd.childrenCache().calculatedSize<=8);
  fs.writeFileSync(cwd+'/later','x');assert(s.readdirSync({withFileTypes:false}).includes('later'));
});
test('Windows drive roots, long paths, UNC identities and injected filesystem',()=>{
  let calls=[];const s=new api.PathScurryWin32('c:\\here',{fs:{lstatSync(p){calls.push(p);return {isFile:()=>true};}}});
  assert.equal(s.cwd.resolve('/'),s.root);assert.equal(s.resolve('/file'),'C:\\file');
  assert.equal(s.cwd.resolve('\\\\?\\c:\\x'),s.cwd.resolve('C:\\x'));
  assert.equal(s.cwd.resolve('\\\\?\\UNC\\host\\share\\x'),s.cwd.resolve('\\\\host\\share\\x'));
  assert.equal(s.cwd.resolve('\\\\host\\share'),s.cwd.resolve('\\\\HOST\\SHARE\\'));
  assert.equal(s.cwd.resolve('d:\\file').lstatSync().isFile(),true);assert.deepEqual(calls,['D:\\file']);assert.equal(s.cwd.resolve('D:\\file').fs,s.fs);
  assert.equal(s.resolvePosix('C:\\a'),'//?/C:/a');
});
test('async readdir honors promise overrides and coalesces callback subscribers',async()=>{
 let reads=0;const s=new api.PathScurry('/virtual',{fs:{promises:{async readdir(){reads++;return [{name:'a',isFile:()=>true}];}}}});
 const pending=s.readdir();const cb=new Promise(r=>s.cwd.readdirCB((_,rows)=>r(rows)));const [a,b]=await Promise.all([pending,cb]);assert.deepEqual(a,b);assert.equal(reads,1);assert(a[0].isFile());
});
test('all Dirent types and unknown read errors retain prior stat observations',()=>{
 const names=['File','Directory','SymbolicLink','FIFO','CharacterDevice','BlockDevice','Socket'];
 const s=new api.PathScurry('/virtual',{fs:{readdirSync(){return names.map(name=>({name,['is'+name]:()=>true}));}}});
 const entries=s.readdirSync();for(const n of entries){assert.equal(n.getType(),n.name);for(const kind of names)assert.equal(n['is'+kind](),n.name===kind);}
 const bad=new api.PathScurry('/virtual',{fs:{lstatSync(){return {isFile:()=>true};},readdirSync(){throw Object.assign(new Error('unknown'),{code:'wat'});}}});
 const child=bad.cwd.resolve('file').lstatSync();assert(child.isFile());assert.deepEqual(bad.readdirSync(),[]);assert(child.isFile());assert.equal(bad.cwd.children().provisional,0);
});
test('chdir invalidates resolved strings even for previously cached arguments',()=>{
 const s=new api.PathScurryPosix('/before');assert.equal(s.resolve('cached'),'\/before/cached');s.chdir('/after');assert.equal(s.resolve('cached'),'/after/cached');assert.equal(s.resolvePosix('cached'),'/after/cached');
});
test('wide directory enumeration does not spread entries into the argument stack',()=>{
 const entries=Array.from({length:140000},(_,i)=>({name:String(i),isFile:()=>true}));
 const s=new api.PathScurryPosix('/virtual',{fs:{readdirSync(){return entries;}}});
 const rows=s.walkSync();assert.equal(rows.length,140001);assert(rows[1].isFile());assert(s.cwd.childrenCache().calculatedSize<=16384);
});
test('destroy while a directory read is pending does not enqueue its results',async()=>{
 let resolveRead, reads=0;const s=new api.PathScurry('/virtual',{fs:{promises:{readdir(){reads++;return new Promise(r=>{resolveRead=r;});}}}});
 const stream=s.stream(),seen=[];stream.on('data',n=>seen.push(n.name));
 await new Promise(r=>setImmediate(r));assert.equal(reads,1);assert.equal(seen.length,1);
 stream.destroy();resolveRead([{name:'child',isDirectory:()=>true}]);await new Promise(r=>setImmediate(r));
 assert.equal(seen.length,1);assert.equal(stream.bufferLength,0);assert.equal(reads,1);
});
