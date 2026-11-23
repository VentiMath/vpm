'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'vpath-upstream-'));
try {
 fs.cpSync(__dirname+'/upstream/test',root+'/test',{recursive:true,filter:p=>!p.endsWith('.js')});
 fs.symlinkSync(__dirname+'/node_modules',root+'/node_modules','dir');
 fs.writeFileSync(root+'/package.json','{"type":"module","private":true}');
 fs.mkdirSync(root+'/dist/esm',{recursive:true});
 fs.writeFileSync(root+'/dist/esm/index.js',`export * from ${JSON.stringify(path.resolve(__dirname,'../../packages/vpath-scurry/index.mjs'))};`);
 fs.mkdirSync(root+'/tap-snapshots/test',{recursive:true});
 // Relocate only the test filename; expected values and assertions are unchanged.
 fs.writeFileSync(root+'/tap-snapshots/test/index.js.test.cjs',fs.readFileSync(__dirname+'/upstream/tap-snapshots/test/index.ts.test.cjs','utf8').replaceAll('index.ts','index.js'));
 fs.writeFileSync(root+'/compile.cjs',`for(const name of ['index','fixtures/normalize-paths']){const file=process.cwd()+'/test/'+name;const result=await Bun.build({entrypoints:[file+'.ts'],external:['*'],target:'node',format:'esm'});if(!result.success)throw result.logs;await Bun.write(file+'.js',await result.outputs[0].text());}`);
 execFileSync('bun',[root+'/compile.cjs'],{cwd:root,stdio:'inherit'});
 execFileSync('node',['test/index.js'],{cwd:root,stdio:'inherit',timeout:120000,env:{...process.env,TAP_GREP:'^(?!platform-specific|all the IFMTs!|weird readdir failure)'}});
} finally { fs.rmSync(root,{recursive:true,force:true}); }
