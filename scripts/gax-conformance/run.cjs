'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const {compile}=require('../platform-types.cjs');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vgax-tests-'));
try {
 const snapshot=path.join(__dirname,'upstream'),hashes=require('./upstream/SHA256.json');
 for(const[file,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(snapshot,file))).digest('hex'),hash,file);
 const original=process.argv.includes('--upstream'),target=original?path.join(__dirname,'node_modules/google-gax'):path.resolve(__dirname,'../../packages/vgoogle-gax');
 fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'));
 fs.cpSync(path.join(target,'build'),path.join(temporary,'build'),{recursive:true});
 fs.copyFileSync(path.join(target,'package.json'),path.join(temporary,'package.json'));
 fs.cpSync(path.join(snapshot,'test/fixtures'),path.join(temporary,'build/test/fixtures'),{recursive:true});
 let adapters=0;const files=[];
 for(const file of Object.keys(hashes).filter(f=>f.endsWith('.ts.txt'))) {
  // Preserve callable namespaces and Sinon-mutable CJS module objects under TS 7.
  let source=fs.readFileSync(path.join(snapshot,file),'utf8').replace(/import \* as (\w+) from (['"][^'"]+['"]);/g,(_,name,module)=>{adapters++;return `import ${name} = require(${module});`;});
  if(!original && file.endsWith('/streamArrayParser.ts.txt')){
   // One deliberate difference: retain strict ProtoJSON message validation.
   // Keep the original malformed payload; require an error instead of defaults.
   const title="it('should assign default value if the service response is not valid protobuf specific JSON'";
   const start=source.indexOf(title),body=source.indexOf('    pipeline(inStream, streamArrayParser',start),end=source.indexOf('\n  it(',body);
   assert.ok(start>=0&&body>start&&end>body);
   source=source.slice(0,body)+`    pipeline(inStream, streamArrayParser, err => {try {assert(err instanceof TypeError);done();} catch(error){done(error);}});\n    streamArrayParser.resume();\n  });\n`+source.slice(end);
  }
  const output=path.join(temporary,'source',file.slice(0,-4));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,source);files.push(output);
 }
 const result=compile({files,compilerOptions:{rootDir:path.join(temporary,'source'),outDir:path.join(temporary,'build'),target:'ES2022',module:'CommonJS',noCheck:true,esModuleInterop:true,useDefineForClassFields:false}});assert.equal(result.status,0,result.output);
 const aliases=original?{}:Object.fromEntries(['vgrpc-js','vgrpc-proto-loader','vopentelemetry-api','vduplexify','vgoogle-auth-library','vgoogle-logging-utils','vobject-hash','vproto3-json-serializer','vprotobufjs','vretry-request'].map(name=>[name,path.resolve(__dirname,'../../packages',name)]));
 const mapping={'@grpc/grpc-js':'vgrpc-js','@grpc/proto-loader':'vgrpc-proto-loader','@opentelemetry/api':'vopentelemetry-api','duplexify':'vduplexify','google-auth-library':'vgoogle-auth-library','google-logging-utils':'vgoogle-logging-utils','object-hash':'vobject-hash','proto3-json-serializer':'vproto3-json-serializer','protobufjs':'vprotobufjs','retry-request':'vretry-request'};
 const tests=files.map(f=>path.basename(f,'.ts')+'.js').filter(f=>!['utils.js','otelHarness.js'].includes(f)).sort();
 fs.writeFileSync(path.join(temporary,'run.cjs'),`
 const {createRequire,isBuiltin}=require('node:module'),path=require('node:path'),fs=require('node:fs');
 const aliases=${JSON.stringify(aliases)},mapping=${JSON.stringify(mapping)},original=${original};
 const cache=new Map();
 function alias(name){
  if(name==='google-gax')return __dirname+'/build/src/index.js';
  if(name.startsWith('google-gax/')){const sub=name.slice(11);return __dirname+(sub.startsWith('build/')?'/':'/build/src/')+sub;}
  if(!original){for(const [base,replacement]of Object.entries(mapping)){if(name===base||name.startsWith(base+'/')){name=replacement+name.slice(base.length);break;}}
   for(const[base,directory]of Object.entries(aliases)){if(name===base||name.startsWith(base+'/')){name=directory+name.slice(base.length);break;}}}
  return name;
 }
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
  const local=createRequire(file),module={exports:{}};cache.set(file,module);
  function req(name){name=alias(name);if(isBuiltin(name))return local(name);const resolved=local.resolve(name);return resolved.startsWith(__dirname+'/build/')||resolved.includes('/@google-cloud/dialogflow-cx/')?load(resolved):local(name);}
  req.resolve=name=>local.resolve(alias(name));req.cache=require.cache;
  new Function('exports','require','module','__filename','__dirname',fs.readFileSync(file,'utf8'))(module.exports,req,module,file,path.dirname(file));return module.exports;
 }
 const Mocha=require('mocha');const m=new Mocha({reporter:'json',timeout:20000});
 for(const f of ${JSON.stringify(tests)})m.addFile(__dirname+'/build/test/unit/'+f);
 m.loadFiles=function(fn){for(const file of this.files){this.suite.emit('pre-require',global,file,this);this.suite.emit('require',load(file),file,this);this.suite.emit('post-require',global,file,this);}if(fn)fn();};
 m.run(n=>{process.exitCode=n?1:0;}).on('fail',(test,error)=>process.stderr.write(test.fullTitle()+': '+error.message+'\\n')).on('test',test=>{if(process.env.GAX_PROGRESS)require('node:fs').writeFileSync(process.env.GAX_PROGRESS,test.fullTitle());});
 `);
 const run=spawnSync(process.execPath,[path.join(temporary,'run.cjs')],{cwd:temporary,encoding:'utf8',maxBuffer:12e6,timeout:180000});
 if(run.stderr)process.stderr.write(run.stderr);const offset=run.stdout.indexOf('{\n  "stats"');if(offset<0){console.error(run.stdout);throw run.error||new Error('No Mocha report');}
 const report=JSON.parse(run.stdout.slice(offset));console.log(JSON.stringify({variant:original?'upstream':'vpm',files:tests.length,namespaceImportAdapters:adapters,stats:report.stats,failures:report.failures.map(f=>({title:f.fullTitle,error:f.err.message,stack:f.err.stack})),pending:report.pending.map(f=>f.fullTitle)},null,2));
 assert.ifError(run.error);assert.equal(run.status,0);assert.equal(report.stats.tests,755);assert.equal(report.stats.passes,751);assert.equal(report.stats.pending,4);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
