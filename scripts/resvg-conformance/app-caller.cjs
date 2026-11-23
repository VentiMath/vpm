'use strict';
// Read-only integration check. Private app sources are exported only to a temp folder.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const [app,ref='origin/main']=process.argv.slice(2);if(!app)throw Error('Pass the VentiMath checkout path and optional revision');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vresvg-private-caller-'));
const run=(cmd,args,cwd=temp)=>execFileSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']});
const sourceCommit=run('git',['rev-parse',ref],app).trim(),hashes={};
try{
 for(const file of ['writeupPicture.ts','writeupPicture.test.ts','longhandLayout.ts']){const source=run('git',['show',sourceCommit+':functions/src/'+file],app);fs.writeFileSync(temp+'/'+file,source);hashes[file]=createHash('sha256').update(source).digest('hex');}
 fs.mkdirSync(temp+'/node_modules/@resvg',{recursive:true});fs.symlinkSync(process.env.VPM_RESVG_PACKAGE_DIR||path.resolve(__dirname,'../../packages/vresvg'),temp+'/node_modules/@resvg/resvg-js','dir');
 fs.symlinkSync(process.env.VPM_RESVG_PACKAGE_DIR||path.resolve(__dirname,'../../packages/vresvg'),temp+'/node_modules/vresvg','dir');
 fs.copyFileSync(__dirname+'/app-probe.ts',temp+'/probe.ts');
 process.stdout.write(run('bun',['test','writeupPicture.test.ts']));process.stdout.write(run('bun',['probe.ts']));
 run('bun',['build','probe.ts','--target=node','--format=esm','--packages=external','--outfile=probe.mjs']);process.stdout.write(run('node',['probe.mjs']));
 const result=execFileSync('node',[__dirname+'/compare.cjs'],{encoding:'utf8',env:{...process.env,VRESVG_APP_FIXTURES:temp+'/fixtures.json'},timeout:120000});
 const pixels=JSON.parse(result);console.log(JSON.stringify({sourceCommit,sourceSHA256:hashes,pixelCases:pixels.cases,maxInkDifference:pixels.maxInkDifference,maxInkChange:pixels.maxInkChange,privateDataExported:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
