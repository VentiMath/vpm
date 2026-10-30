'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const snapshot=path.join(__dirname,'upstream'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlong-upstream-'));
try {
  for(const [file,hash] of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(snapshot,file))).digest('hex'),hash,file);
  assert.equal(require('./node_modules/long/package.json').version,'5.3.2');
  assert.equal(fs.readFileSync(path.join(snapshot,'index.js.txt'),'utf8'),fs.readFileSync(path.join(__dirname,'node_modules/long/index.js'),'utf8'));
  const target=process.argv.includes('--upstream')?require.resolve('./node_modules/long'):require.resolve('../../packages/vlong');
  fs.writeFileSync(path.join(temp,'package.json'),'{"type":"module"}');
  fs.writeFileSync(path.join(temp,'index.js'),'import Long from '+JSON.stringify(target)+'; export default Long;');
  fs.mkdirSync(path.join(temp,'umd'));
  fs.writeFileSync(path.join(temp,'umd/package.json'),'{"type":"commonjs"}');
  fs.writeFileSync(path.join(temp,'umd/index.js'),'module.exports=require('+JSON.stringify(target)+');');
  for(const file of ['tests/index.js','tests/goog/base.js','tests/goog/long_test.js']){
    const dest=path.join(temp,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(snapshot,file+'.txt'),dest);
  }
  const result=spawnSync(process.execPath,[path.join(temp,'tests/index.js')],{encoding:'utf8',timeout:30000});
  if(result.status!==0)console.error(result.stdout,result.stderr);
  assert.equal(result.status,0,String(result.error||'upstream suite failure'));
  const tests=result.stdout.split('\n').filter(line=>line.startsWith('- '));
  assert.equal(new Set(tests).size,tests.length,'duplicate test names');
  assert.equal(tests.length,175,'upstream case count changed');
  console.log(`${process.argv.includes('--upstream')?'Upstream':'VPM'}: ${tests.length} unchanged upstream/Closure cases and CommonJS entry checks passed.`);
} finally {fs.rmSync(temp,{recursive:true,force:true});}
