'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {compiler}=require('../platform-types.cjs');
const root=path.resolve(__dirname,'../..');
const archive=path.join(__dirname,'proxy-agents-agent-base-7.1.4.tar.gz');
assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),'181046a2a15cbc2df06287e5256e508bf46583b4513ec8a31b878d74467490b5');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vagent-conformance-'));
const upstream=process.argv.includes('--upstream');
function run(command,args,options={}){const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:4*1024*1024,timeout:60000,...options});assert.equal(r.status,0,r.stdout+r.stderr+String(r.error||''));return r.stdout;}
try{
  run('tar',['-xzf',archive,'--strip-components=1','-C',temporary]);
  const directory=path.join(temporary,'packages/agent-base');
  fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'),'dir');
  const source=path.join(directory,'test/test.ts');
  let text=fs.readFileSync(source,'utf8');assert.equal((text.match(/\bit\(/g)||[]).length,15);
  // The exact TLS pool-key suffix is a runtime detail: compare the native method.
  const literal='`127.0.0.1:${port}::::::::false:::::::::::::`';
  assert.equal(text.split(literal).length,2);
  text=text.replace(literal,'https.Agent.prototype.getName.call(this, opts)');
  const marker="describe('\"https\" module'";
  const offset=text.indexOf(marker);assert(offset>0);
  const secure=text.slice(offset);assert.equal(secure.split('const addr = await listen(server);').length,3);
  text=text.slice(0,offset)+secure.replaceAll('const addr = await listen(server);', "const addr = await listen(server); addr.protocol = 'https:';");
  fs.writeFileSync(source,text);
  fs.writeFileSync(path.join(directory,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'CommonJS',esModuleInterop:true,noCheck:true,outDir:'compiled',rootDir:'.'},files:['test/test.ts']}));
  run(process.execPath,[compiler().path,'-p',path.join(directory,'tsconfig.json')]);
  const target=path.resolve(root,upstream?'scripts/consumers/node_modules/agent-base':'packages/vagent-base');
  fs.mkdirSync(path.join(directory,'compiled/src'),{recursive:true});
  fs.writeFileSync(path.join(directory,'compiled/src/index.js'),'module.exports=require('+JSON.stringify(target)+');\n');
  const compiled=path.join(directory,'compiled/test/test.js');
  const setup="const {describe,it}=require('node:test');const expect=value=>({toEqual:expected=>require('node:assert/strict').deepEqual(value,expected)});\n";
  fs.writeFileSync(compiled,setup+fs.readFileSync(compiled,'utf8'));
  for(const file of ['ssl-cert-snakeoil.key','ssl-cert-snakeoil.pem'])fs.copyFileSync(path.join(directory,'test',file),path.join(directory,'compiled/test',file));
  const result=spawnSync(process.execPath,process.versions.bun?['test',compiled]:['--test',compiled],{encoding:'utf8',maxBuffer:4*1024*1024,timeout:30000});
  const output=result.stdout+result.stderr;console.log(output);
  assert.equal(result.status,0,String(result.error||result.signal||'Upstream cases failed'));
  if(process.versions.bun)assert.match(output,/15 pass/);else assert.match(output,/(?:#|ℹ) pass 15/);
  console.log((upstream?'agent-base':'vagent-base')+': all 15 upstream cases passed; native TLS pool-name expectation; TypeScript '+compiler().version);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
