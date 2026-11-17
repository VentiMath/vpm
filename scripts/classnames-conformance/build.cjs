'use strict';
const fs=require('node:fs'),path=require('node:path'),base=__dirname+'/node_modules/.vpm-classnames',esbuild=require('esbuild');fs.mkdirSync(base,{recursive:true});
const metadata=require('redoc/package.json');
for(const kind of ['own','upstream']){
 const implementation=kind==='own'?(process.env.VCLASSNAMES_ENTRY||path.resolve(__dirname,'../../packages/vclassnames'))+'/index.cjs':require.resolve('classnames');
 const shim=base+'/'+kind+'-shim.cjs';fs.writeFileSync(shim,'const fn=require('+JSON.stringify(implementation)+');globalThis.classnamesCalls=0;module.exports=(...args)=>{globalThis.classnamesCalls++;return fn(...args)};');
 esbuild.buildSync({entryPoints:[__dirname+'/caller.cjs'],bundle:true,platform:'node',format:'cjs',outfile:base+'/'+kind+'.cjs',alias:{classnames:shim,redoc:require.resolve('redoc')},external:[...Object.keys({...metadata.dependencies,...metadata.peerDependencies}).filter(n=>n!=='classnames')],define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
}
module.exports=base;
