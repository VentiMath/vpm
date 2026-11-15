'use strict';
const path=require('node:path'),fs=require('node:fs'),esbuild=require('./node_modules/esbuild'),dir=path.join(__dirname,'node_modules/.vpm');fs.mkdirSync(dir,{recursive:true});
for(const version of ['current','app','vpm']){
 const file=version==='vpm'?process.env.VPM_RESELECT_INSTALL||path.resolve(__dirname,'../../packages/vreselect/index.cjs'):path.join(__dirname,'node_modules',version==='current'?'reselect':'reselect-app');
 esbuild.buildSync({entryPoints:[path.join(__dirname,'node_modules/@mui/x-internals/store/createSelector.js')],outfile:path.join(dir,version+'.cjs'),bundle:true,platform:'node',format:'cjs',alias:{reselect:file},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
}
module.exports=dir;
