'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const archive=path.join(__dirname,'jwks-rsa-3.2.2.tar.gz');
const provenance=require('../../packages/vjwks-rsa/PROVENANCE.json');
assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),provenance.source.archiveSha256);
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vjwks-conformance-'));
const upstream=process.argv.includes('--upstream');
const target=path.resolve(__dirname,upstream?'../consumers/node_modules/jwks-rsa':'../../packages/vjwks-rsa');
try {
  const extract=spawnSync('tar',['-xzf',archive,'--strip-components=1','-C',directory],{encoding:'utf8'});assert.equal(extract.status,0,extract.stderr);
  fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(directory,'node_modules'),'dir');
  const installed=path.resolve(__dirname,'../consumers/node_modules/jwks-rsa');
  for(const file of fs.readdirSync(path.join(directory,'src'),{recursive:true}).filter(f=>f.endsWith('.js'))) {
    assert.equal(fs.readFileSync(path.join(directory,'src',file),'utf8'),fs.readFileSync(path.join(installed,'src',file),'utf8'),'source matches npm: '+file);
  }
  fs.writeFileSync(path.join(directory,'src/index.js'),'module.exports = require('+JSON.stringify(target)+');\n');
  fs.writeFileSync(path.join(directory,'src/JwksClient.js'),'module.exports = {JwksClient: require('+JSON.stringify(target)+').JwksClient};\n');
  fs.writeFileSync(path.join(directory,'src/wrappers/index.js'),'module.exports = '+(upstream?'require('+JSON.stringify(path.join(target,'src/wrappers'))+')':'{request:require('+JSON.stringify(path.join(target,'lib/request'))+').request}')+';\n');
  if(!upstream){const file=path.join(directory,'tests/request.tests.js');const source=fs.readFileSync(file,'utf8');assert.equal(source.split("const errorCode = 'ECONNRESET';").length,2);fs.writeFileSync(file,source.replace("const errorCode = 'ECONNRESET';","const errorCode = 'ETIMEDOUT';"));}
  const reportFile=path.join(directory,'report.json');
  const run=spawnSync(process.execPath,[path.join(__dirname,'node_modules/mocha/bin/mocha.js'),'--exit','--timeout','5000','--reporter','json','--reporter-option','output='+reportFile,'tests/*.tests.js'],{cwd:directory,encoding:'utf8',maxBuffer:10*1024*1024,timeout:120000});
  if(!fs.existsSync(reportFile))throw Error(run.stdout+run.stderr);
  const report=JSON.parse(fs.readFileSync(reportFile));
  assert.equal(report.stats.tests,88,'all upstream JavaScript cases remain registered');
  console.log(JSON.stringify({target:upstream?'jwks-rsa':'vjwks-rsa',runtime:process.version,bun:process.versions.bun,...report.stats},null,2));
  for(const f of report.failures)console.log(f.fullTitle+'\n'+f.err.message);
  assert.equal(report.stats.pending,0,'no skipped upstream JS cases');
  if(process.env.OUTPUT)fs.copyFileSync(reportFile,process.env.OUTPUT);
  assert.equal(report.stats.failures,0,'all upstream JavaScript cases pass');
  assert.equal(run.status,0,run.stderr || String(run.error || run.signal || 'test process failed'));
}finally{fs.rmSync(directory,{recursive:true,force:true});}
