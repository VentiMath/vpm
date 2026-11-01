'use strict';
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
for(const [name,hash]of Object.entries(require('./upstream/provenance.json').files))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',name))).digest('hex'),hash,name);
const retained={name:'retained upstream test loader',setup(build){build.onResolve({filter:/^retained:/},({path:name})=>({path:path.join(__dirname,'upstream',name.slice(9))}));build.onLoad({filter:/\.ts\.txt$/},async({path:file})=>({contents:fs.readFileSync(file,'utf8'),loader:'ts'}));build.onResolve({filter:/^(vitest|\.\.\/\.\.\/src(?:\/.*)?)$/},()=>({path:path.join(__dirname,'upstream-harness.mjs')}));}};
(async()=>{
 for(const variant of ['upstream','vpm']) {
  const result=await Bun.build({entrypoints:[path.join(__dirname,'browser-entry.mjs')],target:'browser',format:'esm',outfile:path.join(process.argv[2],variant+'.mjs'),plugins:variant==='upstream'?[retained]:[retained,{name:'VPM DOM, core and utils',setup(build){build.onResolve({filter:/^@floating-ui\/(?:dom|core|utils(?:\/dom)?)$/},({path:specifier})=>({path:path.resolve(__dirname,'../../packages',specifier==='@floating-ui/dom'?'vfloating-ui-dom':specifier==='@floating-ui/core'?'vfloating-ui-core':'vfloating-ui-utils',specifier==='@floating-ui/utils/dom'?'dom.mjs':'runtime.mjs')}));}}]});
  if(!result.success)throw new Error(result.logs.join('\n'));
  await Bun.write(path.join(process.argv[2],variant+'.mjs'),result.outputs[0]);
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
