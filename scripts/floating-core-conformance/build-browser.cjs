'use strict';
const path=require('node:path');
(async()=>{
 for(const variant of ['upstream','vpm']) {
  const result=await Bun.build({entrypoints:[path.join(__dirname,'browser-entry.mjs')],target:'browser',format:'esm',outfile:path.join(process.argv[2],variant+'.mjs'),plugins:variant==='upstream'?[]:[{name:'VPM core and utils',setup(build){build.onResolve({filter:/^@floating-ui\/(?:core|utils(?:\/dom)?)$/},({path:specifier})=>({path:path.resolve(__dirname,'../../packages',specifier==='@floating-ui/core'?'vfloating-ui-core':'vfloating-ui-utils',specifier.endsWith('/dom')?'dom.mjs':'runtime.mjs')}));}}]});
  if(!result.success)throw new Error(result.logs.join('\n'));
  await Bun.write(path.join(process.argv[2],variant+'.mjs'),result.outputs[0]);
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
