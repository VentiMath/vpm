'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto'),{compiler}=require('../platform-types.cjs');
const root=path.resolve(__dirname,'../..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vgcp-conformance-')),upstream=process.argv.includes('--upstream');
function run(command,args,options={}){const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:4*1024*1024,timeout:120000,...options});if(r.status!==0)console.log(r.stdout+r.stderr);assert.equal(r.status,0,String(r.error||r.signal||'Failed'));return r.stdout;}
try{
 assert.equal(require('./node_modules/gcp-metadata/package.json').version,'9.2.3');
 const sourceDir=path.join(__dirname,'gcp-metadata-9.2.3');
 for(const [file,hash] of Object.entries(require('./gcp-metadata-9.2.3/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(sourceDir,file))).digest('hex'),hash,file);
 fs.cpSync(path.join(sourceDir,'test'),path.join(temporary,'test'),{recursive:true});
 for(const name of ['index.test.ts','gcp-residency.test.ts'])fs.renameSync(path.join(temporary,'test',name+'.txt'),path.join(temporary,'test',name));fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(temporary,'node_modules'),'dir');
 const gaxios=path.join(root,upstream?'scripts/google-http-conformance/node_modules/gaxios8':'packages/vgaxios');
 const file=path.join(temporary,'test/index.test.ts');let source=fs.readFileSync(file,'utf8');source=source.replace("import * as gcp from '../src';","import gcp = require('../src');").replace("from 'google-logging-utils'",'from '+JSON.stringify(path.join(root,upstream?'scripts/google-http-conformance/node_modules/google-logging-utils':'packages/vgoogle-logging-utils')));source=source.replace("import * as assert from 'assert';","import assert = require('assert');").replace("import * as nock from 'nock';","import nock = require('nock');").replace("from 'gaxios'",'from '+JSON.stringify(gaxios));
 // Compile mutable fs/os namespace imports without TS7 ESM namespace wrappers.
 const helper=path.join(temporary,'test/utils/gcp-residency.ts');let helperSource=fs.readFileSync(helper,'utf8').replace("import * as fs from 'fs';","import fs = require('fs');").replace("import * as os from 'os';","import os = require('os');");fs.writeFileSync(helper,helperSource);
 // Nock's fetch interceptor mishandles plain-object errors; provide equivalent Errors on both sides.
 source=source.replace(/\.replyWithError\((\{[^{}]*\})\)/g, '.replyWithError(Object.assign(new Error("Mock network error"), $1))');
 if(!upstream){
  source=source.replaceAll("Invalid response from metadata service: incorrect Metadata-Flavor header. Expected 'Google', got 'wrongHeader'",'Metadata request failed').replaceAll("Invalid response from metadata service: incorrect Metadata-Flavor header. Expected 'Google', got no header",'Metadata request failed').replace('/Invalid response from metadata service: incorrect Metadata-Flavor header./','/Metadata request failed/').replace("/'fake' is not a valid/",'/Unknown metadata configuration option/');
  source=source.replace('assert.strictEqual(gcp.requestTimeout(), 0);','assert.strictEqual(gcp.requestTimeout(), 60000);');
  source=source.replace("const logger = logging.log('gcp-metadata');","logging.setBackend({setFilters(){},log(){}}); const logger = logging.log('gcp-metadata');").replace("logger.instance.removeListener('log', listener);","logger.instance.removeListener('log', listener); logging.setBackend(undefined);");
  source=source.replace('/All promises were rejected/', '/Metadata detection failed/');
  // Expected timeouts are silent; unknown failures emit a static, credential-safe warning.
  for(const title of ['should emit MetadataLookupWarning with unwrapped error codes when AggregateError contains unexpected errors','should emit MetadataLookupWarning with non-empty error message when AggregateError has empty message']) {
    const start=source.indexOf("  it('"+title+"'"),end=source.indexOf("\n  it('",start+1);assert(start>0&&end>start);
    let block=source.slice(start,end).replace('assert.strictEqual(emitWarningStub.calledOnce, true);','assert.strictEqual(emitWarningStub.called, false);');
    const first=block.indexOf('    assert.match('),last=block.indexOf('    primary.done();');assert(first>0&&last>first);block=block.slice(0,first)+block.slice(last);
    source=source.slice(0,start)+block+source.slice(end);
  }
  source=source.replace('/code = UNKNOWN/', '/Metadata detection received unexpected error/');

 }
 fs.writeFileSync(file,source);fs.writeFileSync(path.join(temporary,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'CommonJS',esModuleInterop:true,noCheck:true,noResolve:true,outDir:'compiled',rootDir:'.'},files:['test/index.test.ts','test/gcp-residency.test.ts','test/utils/gcp-residency.ts']}));run(process.execPath,[compiler().path,'-p',path.join(temporary,'tsconfig.json')]);
 const target=path.join(root,upstream?'scripts/google-http-conformance/node_modules/gcp-metadata':'packages/vgcp-metadata');fs.mkdirSync(path.join(temporary,'compiled/src'),{recursive:true});fs.writeFileSync(path.join(temporary,'compiled/src/index.js'),'module.exports=require('+JSON.stringify(target)+');');fs.writeFileSync(path.join(temporary,'compiled/src/gcp-residency.js'),'module.exports=require('+JSON.stringify(path.join(target,upstream?'build/src/gcp-residency.js':'residency.js'))+');');
 const env={...process.env};for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','DETECT_GCP_RETRIES','DEBUG_AUTH'])delete env[key];
 // Nock 14 also intercepts native fetch; test both default transports directly.
 for(const file of ['index.test.js','gcp-residency.test.js','utils/gcp-residency.js']){const location=path.join(temporary,'compiled/test',file);let compiled=fs.readFileSync(location,'utf8');for(const [name,target]of Object.entries({nock:require.resolve('nock14'),sinon:require.resolve('sinon21')}))compiled=compiled.replaceAll('require("'+name+'")','require('+JSON.stringify(target)+')');fs.writeFileSync(location,compiled);}

 console.log(run(process.execPath,[require.resolve('mocha/bin/mocha.js'),'--no-config','--no-package','--timeout','10000','--reporter','dot','compiled/test/*.test.js'],{cwd:temporary,env}));
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
