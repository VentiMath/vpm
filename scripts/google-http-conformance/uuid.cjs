'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vuuid-conformance-')),upstream=process.argv.includes('--upstream');
try{
 const archive=path.join(__dirname,'uuid-9.0.1.tar.gz');assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),'7579a80ae1aabfbbf81e3b053079a86f755ac73173389a8a3eba145fc70b6610');assert.equal(spawnSync('tar',['-xzf',archive,'--strip-components=1','-C',temporary]).status,0);
 const target=path.join(root,upstream?'scripts/consumers/node_modules/gaxios/node_modules/uuid':'packages/vuuid');
 const files=fs.readdirSync(path.join(temporary,'test/unit')).filter(f=>f.endsWith('.test.js'));
 let total=0,skips=0;
 for(const file of files){let source=fs.readFileSync(path.join(temporary,'test/unit',file),'utf8');
  source=source.replace("import assert from 'assert';","const assert=require('node:assert');const {test,describe}=require('node:test');");
  source=source.replace("import gen from 'random-seed';",'const gen=require('+JSON.stringify(require.resolve('random-seed'))+');');
  source=source.replace("import stringify, { unsafeStringify } from '../../src/stringify.js';",'const stringify=require('+JSON.stringify(target)+').stringify;const {unsafeStringify}=require('+JSON.stringify(path.join(target,upstream?'dist/stringify.js':'lib/stringify.js'))+');');
  source=source.replace(/import (\w+) from '\.\.\/\.\.\/src\/([^']+)\.js';/g,(_,name,module)=>{
   if(module==='rng')return 'const '+name+'=require('+JSON.stringify(path.join(target,upstream?'dist/rng.js':'lib/rng.js'))+').default;';
   if(['md5','sha1','md5-browser','sha1-browser'].includes(module))return '';
   return 'const '+name+'=require('+JSON.stringify(target)+')['+JSON.stringify(module==='nil'?'NIL':module)+'];';
  });
  for(const name of ['sha1 node','sha1 browser','md5 node','md5 browser'])source=source.replace("test('"+name+"'","test.skip('"+name+"'");
  const dest=path.join(temporary,file+'.cjs');fs.writeFileSync(dest,source);const r=spawnSync(process.execPath,process.versions.bun?['test',dest]:['--test',dest],{encoding:'utf8',timeout:30000});const output=r.stdout+r.stderr;
  assert.equal(r.status,0,output);const passed=output.match(process.versions.bun?/(\d+) pass/:/(?:#|ℹ) pass (\d+)/);const skipped=output.match(process.versions.bun?/(\d+) skip/:/(?:#|ℹ) skipped (\d+)/);total+=Number(passed?.[1]||0);skips+=Number(skipped?.[1]||0);
 }
 assert.equal(total,45);assert.equal(skips,4);console.log(`${upstream?'uuid':'vuuid'}: ${total} upstream tests passed; four private/browser hash-helper tests excluded (native hashes tested through v3/v5).`);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
