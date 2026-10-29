'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {compiler}=require('../platform-types.cjs');
const root=path.resolve(__dirname,'../..'),upstream=process.argv.includes('--upstream');
const archive=path.join(__dirname,'proxy-agents-https-proxy-agent-7.0.6.tar.gz');
assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),'b56fff3bb7ab6c12674333781860badcd3faf5712f801cefd9510bc639cb42de');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vhttps-proxy-conformance-'));
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:8*1024*1024,timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr+String(r.error||''));return r.stdout;}
try{
  run('tar',['-xzf',archive,'--strip-components=1','-C',temporary]);
  fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'),'dir');
  const directory=path.join(temporary,'packages/https-proxy-agent'),file=path.join(directory,'test/test.ts');
  let source=fs.readFileSync(file,'utf8');assert.equal((source.match(/\bit\(/g)||[]).length,15);assert.equal((source.match(/\btestIf\(/g)||[]).length,3);
  for(const name of ['sslServer','sslProxy']){
    const needle=name+'Url = await listen('+name+');';assert.equal(source.split(needle).length,2);
    source=source.replace(needle,needle+' '+name+"Url.protocol = 'https:';");
  }
  if(!upstream){const old='Invalid header from proxy CONNECT response: "badheader"';assert.equal(source.split(old).length,2);source=source.replace(old,'Invalid header from proxy CONNECT response');}
  fs.writeFileSync(file,source);
  fs.writeFileSync(path.join(directory,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'CommonJS',esModuleInterop:true,noCheck:true,outDir:'compiled',rootDir:'.'},files:['test/test.ts']}));
  run(process.execPath,[compiler().path,'-p',path.join(directory,'tsconfig.json')]);
  const target=path.resolve(root,upstream?'scripts/consumers/node_modules/https-proxy-agent':'packages/vhttps-proxy-agent');
  fs.mkdirSync(path.join(directory,'compiled/src'),{recursive:true});fs.writeFileSync(path.join(directory,'compiled/src/index.js'),'module.exports=require('+JSON.stringify(target)+');\n');
  const compiled=path.join(directory,'compiled/test/test.js');
  const setup="const {describe,it,test,before:beforeAll,after:afterAll,beforeEach}=require('node:test');const expect=value=>({toEqual:other=>require('node:assert/strict').deepEqual(value,other),toBe:other=>require('node:assert/strict').equal(value,other),toMatch:pattern=>require('node:assert/strict').match(value,pattern)});\n";
  fs.writeFileSync(compiled,setup+fs.readFileSync(compiled,'utf8'));
  for(const [name,fixture]of [['ssl-cert-snakeoil.key','tls-key.pem'],['ssl-cert-snakeoil.pem','tls-cert.pem']])fs.copyFileSync(path.join(root,'packages/vagent-base/test',fixture),path.join(directory,'compiled/test',name));
  const r=spawnSync(process.execPath,process.versions.bun?['test',compiled]:['--test',compiled],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:30000});const output=r.stdout+r.stderr;console.log(output);assert.equal(r.status,0,String(r.error||r.signal||'Upstream case failure'));
  assert.match(output,process.versions.bun?/18 pass/:/(?:#|ℹ) pass 18/);
  console.log((upstream?'https-proxy-agent':'vhttps-proxy-agent')+': 18 upstream cases passed.');
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
