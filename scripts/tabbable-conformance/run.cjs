'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const fixtures=require('./fixtures.cjs'),root=path.resolve(__dirname,'../..'),modules=path.join(__dirname,'node_modules');
for(const variant of ['upstream','vpm']) {
 const tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vpm-tabbable-tests-')));
 try {
  fs.symlinkSync(modules,path.join(tmp,'node_modules'),'dir');
  const implementation=variant==='upstream'?path.join(modules,'tabbable/dist/index.esm.js'):path.join(root,'packages/vtabbable/runtime.mjs');
  const alias={tabbable:implementation,react:path.join(modules,'react'),'react-dom':path.join(modules,'react-dom')};
  fs.writeFileSync(path.join(tmp,'vitest.config.mjs'),`export default {resolve:{alias:${JSON.stringify(alias)},dedupe:['react','react-dom']},test:{environment:'jsdom',globals:true,include:['*.test.{mjs,tsx}'],server:{deps:{inline:[/@floating-ui[\\\\/]react/]}}}};`);
  const sources=['unit','node'].map(name=>fs.readFileSync(path.join(__dirname,'upstream/test/unit/'+name+'.test.js.txt'),'utf8'));
  fs.writeFileSync(path.join(tmp,'upstream.test.mjs'),`import * as api from 'tabbable';import {vi} from 'vitest';const fixtures=${JSON.stringify(fixtures)};const jest=vi;const require=name=>name.includes('/src/')?api:fixtures;\n`+sources.map(source=>`{\n${source}\n}`).join('\n'));
  fs.copyFileSync(path.join(__dirname,'regressions.test.tsx.txt'),path.join(tmp,'regressions.test.tsx'));
  const report=path.join(tmp,'result.json'),result=spawnSync(process.execPath,[path.join(modules,'vitest/vitest.mjs'),'run','--root',tmp,'--config',path.join(tmp,'vitest.config.mjs'),'--reporter=json','--outputFile='+report],{encoding:'utf8',timeout:90000,env:{...process.env,VPM_ORIGINAL:variant==='upstream'?'1':'0'}});
  if(!fs.existsSync(report))throw Error(result.stdout+result.stderr);
  const stats=JSON.parse(fs.readFileSync(report));console.log(variant+': '+stats.numPassedTests+'/'+stats.numTotalTests+' pass');
  assert.equal(result.status,0,JSON.stringify(stats.testResults.filter(s=>s.status!=='passed'))+result.stderr);assert.ok(stats.numTotalTests);
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
}
