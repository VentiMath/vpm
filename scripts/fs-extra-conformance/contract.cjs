'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const ours=require('../../packages/vfs-extra');
function snapshot(root){const out={};function visit(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name),key=path.relative(root,file),s=fs.lstatSync(file);if(s.isSymbolicLink())out[key]=['link',fs.readlinkSync(file)];else if(s.isDirectory()){out[key]=['dir'];visit(file)}else out[key]=['file',fs.readFileSync(file,'utf8')]}}visit(root);return out}
async function probe(io,sync,seed,kind){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vfs-extra-contract-'))),p=n=>root+'/'+n;
 const call=(method,...args)=>sync?io[method+'Sync'](...args):io[method](...args);
 try{
  fs.mkdirSync(p('source/sub'),{recursive:true});fs.writeFileSync(p('source/a'),'A'+seed);fs.writeFileSync(p('source/sub/b'),'B'+seed);fs.symlinkSync('a',p('source/link'));
  let rejected=false;
  try{
   switch(kind){
    case 'copy':await call('copy',p('source'),p('deep/dest'));break;
    case 'copy-filter':await call('copy',p('source'),p('dest'),{filter:s=>!s.endsWith('/sub')});break;
    case 'copy-dereference':await call('copy',p('source'),p('dest'),{dereference:true});break;
    case 'copy-skip':case 'copy-error':case 'copy-overwrite':
     fs.mkdirSync(p('dest'));fs.writeFileSync(p('dest/a'),'keep');await call('copy',p('source/a'),p('dest/a'),{overwrite:kind==='copy-overwrite',errorOnExist:kind==='copy-error'});break;
    case 'copy-clobber':fs.writeFileSync(p('dest'),'keep');await call('copy',p('source/a'),p('dest'),{clobber:false});break;
    case 'move':await call('move',p('source/sub'),p('deep/dest'));break;
    case 'move-existing':case 'move-overwrite':fs.mkdirSync(p('dest'));fs.writeFileSync(p('dest/old'),'old');await call('move',p('source/sub'),p('dest'),{overwrite:kind==='move-overwrite'});break;
    case 'ensure-file':await call('ensureFile',p('source/a'));await call('ensureFile',p('new/file'));break;
    case 'ensure-dir':await call('ensureDir',p('new/deep'));break;
    case 'ensure-link':await call('ensureLink',p('source/a'),p('deep/link'));await call('ensureLink',p('source/a'),p('deep/link'));break;
    case 'ensure-symlink':await call('ensureSymlink','../source/a',p('deep/link'));await call('ensureSymlink','../source/a',p('deep/link'));break;
    case 'output':await call('outputFile',p('new/file'),'hello '+seed);break;
    case 'output-json':await call('outputJSON',p('new/file'),{seed,unicode:'é🦋'},{spaces:seed%2?'\t':2,EOL:seed%2?'\n':'\r\n'});break;
    case 'empty':await call('emptyDir',p('source'));break;
    case 'remove':await call('remove',p('source'));await call('remove',p('missing'));break;
   }
  }catch{rejected=true}
  return {rejected,files:snapshot(root)};
 }finally{fs.rmSync(root,{recursive:true,force:true})}
}
(async()=>{
 let count=0;const kinds=['copy','copy-filter','copy-dereference','copy-skip','copy-error','copy-overwrite','copy-clobber','move','move-existing','move-overwrite','ensure-file','ensure-dir','ensure-link','ensure-symlink','output','output-json','empty','remove'];
 for(const sync of [true,false])for(let seed=0;seed<4;seed++)for(const kind of kinds){
  const actual=await probe(ours,sync,seed,kind);
  for(const name of ['fs-extra','fs-extra-app','fs-extra-nine']){assert.deepEqual(actual,await probe(require(name),sync,seed,kind),`${name}/${sync}/${seed}/${kind}`);count++}
 }
 console.log(`${count} filesystem-state and rejection comparisons pass against fs-extra 11.4.1, 11.3.4 and 9.1.0.`);
})().catch(error=>{console.error(error);process.exitCode=1});
