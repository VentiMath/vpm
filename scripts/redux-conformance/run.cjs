'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file))).digest('hex'),hash,file);
assert.equal(require('redux/package.json').version,'5.0.1');
assert.equal(fs.readFileSync(path.join(__dirname,'node_modules/redux/dist/redux.d.ts'),'utf8'),fs.readFileSync(path.resolve(__dirname,'../../packages/vredux/index.d.ts'),'utf8'));
assert.equal(fs.readFileSync(path.join(__dirname,'node_modules/redux/src/createStore.ts'),'utf8'),fs.readFileSync(path.join(__dirname,'upstream/src/createStore.ts.txt'),'utf8'));
const upstream=process.argv.includes('--upstream'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-redux-tests-'));
try{
 fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temp,'node_modules'),'dir');
 for(const file of fs.readdirSync(path.join(__dirname,'upstream/test'),{recursive:true})){
  if(!file.endsWith('.ts.txt')||file.startsWith('typescript/')||/utils\/(warning|formatProdErrorMessage)/.test(file))continue;
  const dest=path.join(temp,'test',file.slice(0,-4));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(__dirname,'upstream/test',file),dest);
 }
 const entry=upstream?path.join(__dirname,'node_modules/redux/dist/redux.mjs'):path.resolve(__dirname,'../../packages/vredux/index.mjs');
 fs.mkdirSync(path.join(temp,'src/utils'),{recursive:true});fs.writeFileSync(path.join(temp,'src/index.ts'),`export * from ${JSON.stringify(entry)};`);
 for(const name of ['isAction','isPlainObject'])fs.writeFileSync(path.join(temp,'src/utils',name+'.ts'),`export {${name} as default} from ${JSON.stringify(entry)};`);
 fs.writeFileSync(path.join(temp,'src/utils/symbol-observable.ts'),"export default typeof Symbol==='function'&&Symbol.observable||'@@observable';");
 fs.writeFileSync(path.join(temp,'config.cjs'),`module.exports = {root:${JSON.stringify(temp)},cacheDir:${JSON.stringify(path.join(temp,'cache'))},test:{globals:true,threads:false,include:['test/**/*.spec.ts'],alias:{redux:${JSON.stringify(entry)},'@internal/':${JSON.stringify(path.join(temp,'src/'))}}}};`);
 const child=spawnSync(process.execPath,[path.join(__dirname,'node_modules/vitest/vitest.mjs'),'run','--config',path.join(temp,'config.cjs'),'--reporter=json'],{cwd:temp,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});
 if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,child.stdout);
 const start=child.stdout.search(/\{\s*"numTotalTestSuites"/);assert(start>=0,child.stdout+child.stderr);const report=JSON.parse(child.stdout.slice(start));
 console.log(`${upstream?'Original':'VPM'} Redux: ${report.numPassedTests}/${report.numTotalTests} passed, ${report.numFailedTests} failed.`);
 for(const suite of report.testResults)for(const test of suite.assertionResults)if(test.status!=='passed')console.log(test.fullName,test.failureMessages.join('\n'));
 assert.equal(child.status,0,child.stderr);assert.equal(report.numFailedTests,0);assert.equal(report.numTotalTests,78);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
