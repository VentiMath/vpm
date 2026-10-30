'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const snapshot=path.join(__dirname,'upstream'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vgrpc-loader-tests-'));
try {
 for(const[file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(snapshot,file))).digest('hex'),hash,file);
 fs.cpSync(path.join(snapshot,'test_protos'),path.join(temporary,'test_protos'),{recursive:true});
 const compile=spawnSync(process.execPath,[path.join(__dirname,'compile.cjs'),temporary],{encoding:'utf8'});assert.equal(compile.status,0,compile.stdout+compile.stderr);
 const upstream=process.argv.includes('--upstream'),target=upstream?require.resolve('./node_modules/@grpc/proto-loader'):require.resolve('../../packages/vgrpc-proto-loader');
 fs.mkdirSync(path.join(temporary,'build/src'),{recursive:true});
 fs.writeFileSync(path.join(temporary,'build/src/index.js'),'module.exports=require('+JSON.stringify(target)+');');
 fs.mkdirSync(path.join(temporary,'node_modules'));
 for(const name of ['mocha','google-proto-files'])fs.symlinkSync(path.join(__dirname,'node_modules',name),path.join(temporary,'node_modules',name));
 fs.writeFileSync(path.join(temporary,'run.cjs'),`const Mocha=require('mocha');const mocha=new Mocha({reporter:'json'});mocha.addFile(__dirname+'/build/test/descriptor_type_test.js');mocha.run(n=>{process.exitCode=n?1:0;});`);
 const r=spawnSync(process.execPath,[path.join(temporary,'run.cjs')],{encoding:'utf8',maxBuffer:4e6});
 if(r.status!==0)console.error(r.stdout,r.stderr);
 assert.equal(r.status,0,'Upstream runtime suite failed');
 const report=JSON.parse(r.stdout.slice(r.stdout.indexOf('{\n  "stats"')));
 assert.equal(report.stats.tests,8);assert.equal(report.stats.passes,8);assert.equal(report.stats.pending,0);
 console.log(`${upstream?'Upstream':'VPM'} proto-loader: all eight unchanged upstream runtime tests passed; no skipped cases or assertion changes. CLI generator is outside this runtime package.`);
} finally {fs.rmSync(temporary,{recursive:true,force:true});}
