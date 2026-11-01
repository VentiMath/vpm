'use strict';
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const result=await Bun.build({entrypoints:[path.join(__dirname,'browser-entry.mjs')],target:'browser',format:'esm',plugins:[{name:'fixtures',setup(build){build.onLoad({filter:/fixtures\.cjs$/},()=>({contents:'export default '+JSON.stringify(require('./fixtures.cjs')),loader:'js'}));build.onLoad({filter:/\.js\.txt$/},args=>({contents:fs.readFileSync(args.path,'utf8'),loader:'js'}));}}]});
 if(!result.success)throw Error(result.logs.join('\n'));fs.writeFileSync(path.join(process.argv[2],'vpm.mjs'),await result.outputs[0].text());
})().catch(error=>{console.error(error);process.exitCode=1;});
