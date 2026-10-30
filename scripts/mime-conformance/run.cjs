'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{pathToFileURL}=require('node:url'),{execFile}=require('node:child_process'),util=require('node:util');
module.exports=async function run(upstream=false){
 const base=path.join(__dirname,'upstream'),installed=path.join(__dirname,'node_modules/mime');
 assert.equal(require(path.join(installed,'package.json')).version,'4.1.2');
 for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(base,file))).digest('hex'),hash,file);
 for(const file of ['src/Mime.ts','src/mime_cli.ts','dist/types/standard.js','dist/types/other.js'])assert.equal(fs.readFileSync(path.join(base,file+'.txt'),'utf8').trimEnd(),fs.readFileSync(path.join(installed,file),'utf8').trimEnd(),file);
 const target=upstream?await import(pathToFileURL(path.join(installed,'dist/src/index.js')).href):await import('../../packages/vmime/index.mjs');
 const tests=[],stack=[];
 const helpers=new Function('assert',fs.readFileSync(path.join(base,'test/test_util.js.txt'),'utf8').replace(/^import .*\n/gm,'').replace(/^export /gm,'')+'\nreturn {testGetType,testGetExtension};')(assert);
 let source=fs.readFileSync(path.join(base,'test/mime.test.js.txt'),'utf8').replace(/^import .*\n/gm,'');
 // Only redirect module/CLI locations; every assertion and test body is retained.
 source=source.replace("import('../dist/src/index_lite.js')",'loadLite()');
 const child_process={exec(command,callback){
  const args=command.split(' ');assert.equal(args.shift(),'./bin/cli.js');
  const cli=upstream?path.join(installed,'bin/cli.js'):path.resolve(__dirname,'../../packages/vmime/bin/vmime.cjs');
  execFile(process.execPath,[cli,...args],(error,stdout,stderr)=>callback(error,{stdout,stderr}));
 }};
 new Function('assert','child_process','describe','it','util','Mime','mime','testGetExtension','testGetType','loadLite',source)(assert,child_process,(name,fn)=>{stack.push(name);fn({name});stack.pop();},(name,fn)=>tests.push({name:[...stack,name].join(' / '),fn}),util,target.Mime,target.default,helpers.testGetExtension,helpers.testGetType,()=>import(upstream?pathToFileURL(path.join(installed,'dist/src/index_lite.js')).href:pathToFileURL(path.resolve(__dirname,'../../packages/vmime/lite.mjs')).href));
 for(const {name,fn}of tests)try{await fn({name});}catch(error){throw new Error(name,{cause:error});}
 assert.equal(tests.length,15);
 console.log(`${upstream?'Upstream':'VPM'} mime retained suite: ${tests.length} cases passed, including both CLI cases.`);
};
if(require.main===module)module.exports(process.argv.includes('--upstream')).catch(e=>{console.error(e);process.exitCode=1;});
