'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const {compile}=require('../platform-types.cjs');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vgrpc-tests-'));
try {
  for(const[file,hash]of Object.entries(require('./tls/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'tls',file))).digest('hex'),hash,'TLS '+file);
  const snapshot=path.join(__dirname,'upstream');
  for(const[file,hash]of Object.entries(require('./upstream/SHA256.json'))) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(snapshot,file))).digest('hex'),hash,file);
  const upstream=process.argv.includes('--upstream'),target=path.dirname(require.resolve(upstream?'@grpc/grpc-js':'../../packages/vgrpc-js/build/src/index.js'));
  fs.mkdirSync(path.join(temporary,'source'),{recursive:true});fs.mkdirSync(path.join(temporary,'build'));
  fs.symlinkSync(target,path.join(temporary,'source/src'));fs.symlinkSync(target,path.join(temporary,'build/src'));
  fs.symlinkSync(path.resolve(target,'../../proto'),path.join(temporary,'proto'));
  fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'));
  fs.cpSync(path.join(snapshot,'test/fixtures'),path.join(temporary,'build/test/fixtures'),{recursive:true});
  fs.cpSync(path.join(snapshot,'test/fixtures'),path.join(temporary,'test/fixtures'),{recursive:true});
  for(const name of ['ca.pem','server1.key','server1.pem'])for(const directory of ['build/test/fixtures','test/fixtures'])fs.copyFileSync(path.join(__dirname,'tls',name),path.join(temporary,directory,name));
  const files=[];let adapters=0;
  for(const file of Object.keys(require('./upstream/SHA256.json')).filter(x=>x.endsWith('.ts.txt'))) {
    let source=fs.readFileSync(path.join(snapshot,file),'utf8');
    source=source.replace(/import \* as (\w+) from (['"][^'"]+['"]);/g,(_,name,module)=>{adapters++;return `import ${name} = require(${module});`;});
    const out=path.join(temporary,'source',file.slice(0,-4));fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,source);files.push(out);
  }
  const result=compile({files,compilerOptions:{rootDir:path.join(temporary,'source'),outDir:path.join(temporary,'build'),target:'ES2022',module:'CommonJS',noCheck:true,useDefineForClassFields:false}});
  assert.equal(result.status,0,result.output);
  const selected=process.env.GRPC_TEST_FILES?.split(',');
  const suites=fs.readdirSync(path.join(temporary,'build/test')).filter(x=>/^test-.*\.js$/.test(x)&&(!selected||selected.includes(x.slice(0,-3)))).sort();
  fs.writeFileSync(path.join(temporary,'run.cjs'),`const Mocha=require('mocha'),fs=require('node:fs');const m=new Mocha({reporter:'json',timeout:10000});for(const f of ${JSON.stringify(suites)})m.addFile(__dirname+'/build/test/'+f);m.run(n=>{process.exitCode=n?1:0;setTimeout(()=>process.exit(process.exitCode),250).unref();});`);
  const run=spawnSync(process.execPath,[path.join(temporary,'run.cjs')],{cwd:temporary,encoding:'utf8',maxBuffer:16e6,timeout:240000,env:{...process.env,GRPC_EXPERIMENTAL_ENABLE_OUTLIER_DETECTION:'true'}});
  if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,run.stdout);
  if(run.stderr)process.stderr.write(run.stderr);
  const offset=run.stdout.indexOf('{\n  "stats"');
  if(offset<0){console.error(run.stdout);throw run.error||new Error('No Mocha report');}
  const report=JSON.parse(run.stdout.slice(offset));
  const summary={variant:upstream?'upstream':'vpm',runtime:process.versions.bun?'bun':'node',files:suites.length,namespaceImportAdapters:adapters,stats:report.stats,failures:report.failures.map(f=>({title:f.fullTitle,error:f.err.message})),pending:report.pending.map(f=>f.fullTitle)};
  console.log(JSON.stringify(summary,null,2));
  if(process.env.SUMMARY)fs.writeFileSync(process.env.SUMMARY,JSON.stringify(summary));
  if(!selected){assert.equal(report.stats.tests,508);assert.equal(report.stats.pending,9);}
  assert.ifError(run.error);
  assert.equal(run.status,report.stats.failures?1:0);
  if(!process.argv.includes('--report-only'))assert.equal(run.status,0,`Upstream conformance had ${report.stats.failures} failures`);
} finally {fs.rmSync(temporary,{recursive:true,force:true});}
