'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),modules=path.join(__dirname,'node_modules');
for(const [file,hash]of Object.entries(require('./upstream/SHA256.json')))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',file))).digest('hex'),hash,file);
assert.equal(require('use-callback-ref/package.json').version,'1.3.3');
const ownModules=path.join(root,'packages/vuse-callback-ref/node_modules');fs.mkdirSync(ownModules,{recursive:true});if(!fs.existsSync(path.join(ownModules,'react')))fs.symlinkSync(path.join(modules,'react'),path.join(ownModules,'react'),'dir');
for(const variant of ['upstream','vpm']){
 const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vpm-callback-tests-')));
 try{
  fs.symlinkSync(modules,path.join(temp,'node_modules'),'dir');
  const alias={caller:path.join(temp,'caller.cjs'),subject:variant==='upstream'?require.resolve('use-callback-ref'):path.join(root,'packages/vuse-callback-ref/index.mjs'),react:path.join(modules,'react'),'react-dom':path.join(modules,'react-dom')};
  require('esbuild').buildSync({entryPoints:[path.join(modules,'react-remove-scroll/dist/es2015/UI.js')],bundle:true,platform:'node',format:'cjs',outfile:alias.caller,external:['react','react-dom'],alias:{'use-callback-ref':alias.subject}});
  fs.writeFileSync(path.join(temp,'config.cjs'),`module.exports={resolve:{alias:${JSON.stringify(alias)},dedupe:['react','react-dom']},esbuild:{jsx:'automatic'},test:{threads:false,globals:true,environment:'jsdom',setupFiles:['./setup.ts'],include:['*.test.tsx']}}`);
  fs.writeFileSync(path.join(temp,'setup.ts'),"import {vi,afterEach} from 'vitest';import {cleanup} from '@testing-library/react';globalThis.jest=vi;afterEach(cleanup);");
  for(const file of ['index','ref.spec'])fs.writeFileSync(path.join(temp,file+'.test.tsx'),fs.readFileSync(path.join(__dirname,'upstream/__tests__',file+'.tsx.txt'),'utf8').replaceAll("from '../src'","from 'subject'"));
  if(fs.existsSync(path.join(__dirname,'scenarios.tsx.txt')))fs.copyFileSync(path.join(__dirname,'scenarios.tsx.txt'),path.join(temp,'scenarios.test.tsx'));
  const report=path.join(temp,'report.json'),child=spawnSync(process.execPath,[path.join(modules,'vitest/vitest.mjs'),'run','--root',temp,'--config',path.join(temp,'config.cjs'),'--reporter=json','--outputFile='+report],{encoding:'utf8',timeout:60000,env:{...process.env,VPM_ORIGINAL:variant==='upstream'?'1':'0'}});
  if(!fs.existsSync(report))throw Error(child.stdout+child.stderr);
  const data=JSON.parse(fs.readFileSync(report));console.log(`${variant}: ${data.numPassedTests}/${data.numTotalTests} pass`);
  if(data.numFailedTests)for(const suite of data.testResults)for(const t of suite.assertionResults)if(t.status==='failed')console.error(t.fullName,t.failureMessages.join('\n'));
  assert.equal(child.status,0,child.stderr);assert.equal(data.numFailedTests,0);assert.equal(data.numTotalTests,26);
 }finally{fs.rmSync(temp,{recursive:true,force:true})}
}
