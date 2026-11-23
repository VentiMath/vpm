'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'vglob-upstream-'));
try {
 fs.cpSync(__dirname+'/upstream/test',root+'/test',{recursive:true});
 fs.symlinkSync(__dirname+'/node_modules',root+'/node_modules','dir');
 fs.writeFileSync(root+'/package.json','{"type":"module","private":true}');
 for(const dir of ['src','dist/esm']){fs.mkdirSync(root+'/'+dir,{recursive:true});fs.writeFileSync(root+'/'+dir+'/index.js',`export * from ${JSON.stringify(path.resolve(__dirname,'../../packages/vglob/index.mjs'))};`);}
 // Reproduce the upstream 00-setup filesystem in a private temporary directory.
 for(const file of ['a/.abcdef/x/y/z/a','a/abcdef/g/h','a/abcfed/g/h','a/b/c/d','a/bc/e/f','a/c/d/c/b','a/cb/e/f','a/x/.y/b','a/z/.y/b']){const name=root+'/test/fixtures/'+file;fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,'i like tests');}
 fs.mkdirSync(root+'/test/fixtures/a/symlink/a/b',{recursive:true});fs.symlinkSync('../..',root+'/test/fixtures/a/symlink/a/b/c');
 fs.writeFileSync(root+'/compile.cjs',`const fs=require('node:fs');for(const name of fs.readdirSync('test').filter(n=>n.endsWith('.ts'))){const result=await Bun.build({entrypoints:['test/'+name],external:['*'],target:'node',format:'esm'});if(!result.success)throw result.logs;await Bun.write('test/'+name.replace(/\\.ts$/,'.js'),await result.outputs[0].text());}`);
 execFileSync('bun',['compile.cjs'],{cwd:root,stdio:'inherit'});
 for(const name of fs.readdirSync(root+'/test').filter(n=>n.endsWith('.js'))) {
  console.log('Upstream '+name);execFileSync(process.execPath,['test/'+name],{cwd:root,stdio:'inherit',timeout:30000});
 }
}finally{fs.rmSync(root,{recursive:true,force:true});}
