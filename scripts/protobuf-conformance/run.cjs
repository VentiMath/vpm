'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const fixture=__dirname,temp=fs.mkdtempSync(path.join(os.tmpdir(),'vprotobuf-upstream-'));
try{
 const source=require('./SOURCE.json'),archive=path.join(fixture,source.archive);
 assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),source.sha256);
 assert.equal(spawnSync('tar',['-xzf',archive,'-C',temp]).status,0);
 const upstream=process.argv.includes('--upstream'),target=upstream?path.join(fixture,'node_modules/protobufjs'):path.resolve(fixture,'../../packages/vprotobufjs');
 // Copy only runtime/extension files over the reference layout. Tests remain untouched.
 for(const dir of ['src','ext','google']){fs.rmSync(path.join(temp,dir),{recursive:true});fs.cpSync(path.join(target,dir),path.join(temp,dir),{recursive:true});}
 for(const name of ['index.js','index.d.ts','light.js','light.d.ts','minimal.js','minimal.d.ts'])fs.copyFileSync(path.join(target,name),path.join(temp,name));
 // The separate CLI generates static-code runtime tests; it is not shipped by VPM.
 fs.cpSync(path.join(fixture,'node_modules/protobufjs-cli'),path.join(temp,'cli'),{recursive:true});
 fs.mkdirSync(path.join(temp,'node_modules'));
 for(const name of fs.readdirSync(path.join(fixture,'node_modules')))if(name!=='.bin'&&name!=='protobufjs')fs.symlinkSync(path.join(fixture,'node_modules',name),path.join(temp,'node_modules',name));
 fs.symlinkSync(temp,path.join(temp,'node_modules/protobufjs'));
 fs.symlinkSync(path.resolve(fixture,'../../packages/vlong'),path.join(temp,'node_modules/vlong'));
 const files=fs.readdirSync(path.join(temp,'tests')).filter(f=>f.endsWith('.js')&&!f.startsWith('cli-')).map(f=>'tests/'+f).concat(['tests/node/api_load-sync.js','tests/node/override-mistake.js']).sort();
 const runner=`require('./lib/tape-adapter');const tape=require('tape');let assertions=0,failures=0;const stream=tape.createStream({objectMode:true});stream.on('data',r=>{if(r.type==='assert'){assertions++;if(!r.ok){failures++;console.error(JSON.stringify(r));}}});stream.on('end',()=>{console.log(JSON.stringify({files:${files.length},assertions,failures}));if(failures)process.exitCode=1;});${files.map(f=>'require('+JSON.stringify('./'+f)+');').join('\n')}`;
 fs.writeFileSync(path.join(temp,'run.cjs'),runner);
 const result=spawnSync(process.execPath,['run.cjs'],{cwd:temp,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
 if(result.status!==0)console.error(result.stdout,result.stderr);
 assert.equal(result.status,0,String(result.error||'upstream runtime tests failed'));
 const totals=JSON.parse(result.stdout.trim().split('\n').at(-1));assert.equal(totals.failures,0);assert.equal(totals.assertions,2877);assert.equal(totals.files,79);
 console.log(`${upstream?'Upstream':'VPM'} protobuf.js: ${totals.files} unmodified runtime test files, ${totals.assertions} assertions passed. Separate CLI and legacy UMD-loader tests excluded; VPM browser bundles are checked separately.`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
