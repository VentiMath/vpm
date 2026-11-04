'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-query-first-'));
(async()=>{try{
 for(const version of ['19.1','19.2'])for(const variant of ['upstream','vpm']){
  const peer=version==='19.1'?path.join(root,'scripts/radix-collection-conformance'):__dirname;
  const result=await Bun.build({entrypoints:[path.join(__dirname,'first-render-browser.mjs')],target:'browser',format:'esm',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'query and React control',setup(b){
   b.onResolve({filter:/^@tanstack\/react-query$/},()=>({path:variant==='vpm'?path.join(root,'packages/vtanstack-react-query/index.js'):require.resolve('current-react-query')}));
   b.onResolve({filter:/^vtanstack-/},({path:name})=>({path:path.join(root,'packages',name,name==='vtanstack-query-core'?'query-client.js':'index.js')}));
   b.onResolve({filter:/^react(?:-dom)?(?:\/|$)/},({path:name})=>({path:require.resolve(name,{paths:[peer]})}));
  }}]});assert(result.success,result.logs.join('\n'));await Bun.write(path.join(temp,variant+'.mjs'),result.outputs[0]);
  const check=spawnSync('node',[path.join(__dirname,'first-render-chrome.cjs'),temp,variant],{encoding:'utf8',timeout:90000});assert.equal(check.status,0,check.stdout+check.stderr);console.log(version,check.stdout.trim());
 }
}finally{fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
