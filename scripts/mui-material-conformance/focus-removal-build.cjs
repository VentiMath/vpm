'use strict';
const fs=require('node:fs'),path=require('node:path');
const {fixture,packages,esbuild}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material';
for(const version of ['app','current'])for(const own of [false,true]){
 const dir=base+'/'+version+(own?'-vpm':'-upstream');fs.mkdirSync(dir,{recursive:true});
 const alias=require('../mui-system-conformance/aliases.cjs')(own,version);
 for(const key of Object.keys(alias)){const installed=alias[key].replace(path.resolve(__dirname,'../../packages'),packages);if(fs.existsSync(installed))alias[key]=installed}
 for(const [key,name]of [['@dialog','Dialog'],['@trap','Unstable_TrapFocus']])alias[key]=own?packages+'/vmui-material/'+name+'.mjs':alias['@mui/material']+'/'+name+'/index.js';
 esbuild.buildSync({entryPoints:[__dirname+'/focus-removal-browser-entry.jsx'],outfile:dir+'/focus-removal-browser.js',bundle:true,platform:'browser',format:'iife',nodePaths:[fixture+'/node_modules'],alias:{...alias,react:fixture+'/node_modules/react','react-dom':fixture+'/node_modules/react-dom'},define:{'process.env.NODE_ENV':JSON.stringify(process.env.VPM_REACT_MODE||'production')},logLevel:'silent'});
}
module.exports=base;
