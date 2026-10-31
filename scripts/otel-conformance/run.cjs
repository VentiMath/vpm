'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const {compile}=require('../platform-types.cjs');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'votel-tests-'));
try {
 const snapshot=path.join(__dirname,'upstream'),hashes=require('./upstream/SHA256.json');
 for(const[file,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(snapshot,file))).digest('hex'),hash,file);
 const original=process.argv.includes('--upstream'),target=path.dirname(require.resolve(original?'api-current':'../../packages/vopentelemetry-api/dist/index.cjs'));
 fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'));
 fs.mkdirSync(path.join(temporary,'source'),{recursive:true});fs.mkdirSync(path.join(temporary,'build'),{recursive:true});
 // The version assertion concerns API registry compatibility, which remains 1.10.0.
 fs.copyFileSync(path.join(snapshot,'package.json'),path.join(temporary,'build/package.json'));
 let adapters=0;const files=[];
 for(const file of Object.keys(hashes).filter(f=>f.endsWith('.ts.txt'))) {
  let source=fs.readFileSync(path.join(snapshot,file),'utf8').replace(/import \* as (\w+) from (['"][^'"]+['"]);/g,(_,name,module)=>{adapters++;return `import ${name} = require(${module});`;});
  const output=path.join(temporary,'source',file.slice(0,-4));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,source);files.push(output);
 }
 const result=compile({files,compilerOptions:{rootDir:path.join(temporary,'source'),outDir:path.join(temporary,'build'),target:'ES2022',module:'CommonJS',noCheck:true,useDefineForClassFields:false}});assert.equal(result.status,0,result.output);
 // Forward each compiled source import to its published CJS counterpart. Keeping
 // require() bridges preserves upstream's deliberate cache-clear/reload test.
 for(const file of fs.readdirSync(target,{recursive:true}).filter(x=>x.endsWith('.cjs'))) {
  const bridge=path.join(temporary,'build/src',file.replace(/\.cjs$/,'.js'));fs.mkdirSync(path.dirname(bridge),{recursive:true});fs.writeFileSync(bridge,`module.exports=require(${JSON.stringify(path.join(target,file))});\n`);
 }
 const tests=fs.readdirSync(path.join(temporary,'build/test/common'),{recursive:true}).filter(f=>f.endsWith('.test.js')).sort();
 fs.writeFileSync(path.join(temporary,'run.cjs'),`const Mocha=require('mocha');const m=new Mocha({reporter:'json',timeout:5000});for(const f of ${JSON.stringify(tests)})m.addFile(__dirname+'/build/test/common/'+f);m.run(n=>{process.exitCode=n?1:0;});`);
 const run=spawnSync(process.execPath,[path.join(temporary,'run.cjs')],{cwd:temporary,encoding:'utf8',maxBuffer:8e6,timeout:60000});
 if(run.stderr)process.stderr.write(run.stderr);const offset=run.stdout.indexOf('{\n  "stats"');if(offset<0){console.error(run.stdout);throw run.error||new Error('No Mocha report');}
 const report=JSON.parse(run.stdout.slice(offset));console.log(JSON.stringify({variant:original?'upstream':'vpm',files:tests.length,namespaceImportAdapters:adapters,stats:report.stats,failures:report.failures.map(f=>({title:f.fullTitle,error:f.err.message})),pending:report.pending.map(f=>f.fullTitle)},null,2));
 assert.ifError(run.error);assert.equal(run.status,0);assert.equal(report.stats.pending,0);assert.equal(report.stats.tests,1151);assert.equal(report.stats.passes,1151);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
