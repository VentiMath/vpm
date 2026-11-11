const path = require('node:path');
(async()=>{
 for(const [name,entry] of [['current','./node_modules/goober'],['app','./node_modules/goober-app'],['vpm',process.env.VGOOBER_ENTRY || '../../packages/vgoober/index.mjs']]) {
  const result=await Bun.build({entrypoints:[path.join(__dirname,'browser-entry.mjs')],outdir:path.join(__dirname,'node_modules/.vpm-goober',name),target:'browser',define:{'process.env.NODE_ENV':'"production"', '__FIXTURE_VARIANT__':JSON.stringify(name)},plugins:[{name:'goober-control',setup(build){build.onResolve({filter:/^goober$/},()=>({path:require.resolve(entry)}));}}]});
  if(!result.success)throw Error(result.logs.join('\n'));
 }
})();
