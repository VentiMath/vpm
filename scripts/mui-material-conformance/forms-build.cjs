"use strict";
const fs=require('node:fs'),path=require('node:path');
const {fixture,packages,esbuild}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material';
for(const version of ['current','app'])for(const own of [false,true]){
 const name=version+'-'+(own?'vpm':'upstream');fs.mkdirSync(base+'/'+name,{recursive:true});
 const alias=require('../mui-system-conformance/aliases.cjs')(own,version);
 if(own&&process.env.VPM_MATERIAL_INSTALL)for(const key of Object.keys(alias))alias[key]=alias[key].replace(path.resolve(__dirname,'../../packages'),packages);
 const entry=own?packages+'/vmui-material/index.cjs':alias['@mui/material']+'/index.js';
 alias['@control-input']=alias['@mui/material']+'/InputBase/index.js';alias['@control-context']=alias['@mui/material']+'/FormControl/FormControlContext.js';
 alias['@buttons']=entry;alias['@integration']=own?packages+'/vmui-material/styles/index.cjs':alias['@mui/material']+'/styles/index.js';
 if(own)for(const sub of ['FormControl','FormLabel','FormHelperText'])alias['@mui/material/'+sub]=packages+'/vmui-material/'+sub+'.cjs';
 for(const kind of ['ssr','bench','browser']){
  const input=kind==='ssr'?{stdin:{contents:"const React=require('react');const {FormsScene,HydrationScene}=require('./forms-scene.jsx');module.exports={FormsScene,render:p=>require('react-dom/server').renderToString(React.createElement(FormsScene,p)),hydrate:()=>require('react-dom/server').renderToString(React.createElement(HydrationScene))};",resolveDir:__dirname}}:{entryPoints:[__dirname+'/forms-'+(kind==='bench'?'bench-entry':'browser-entry')+'.jsx']};
  esbuild.buildSync({...input,outfile:base+'/'+name+'/forms-'+kind+(kind==='browser'?'.js':'.cjs'),bundle:true,nodePaths:[fixture+'/node_modules'],platform:kind==='browser'?'browser':'node',format:kind==='browser'?'iife':'cjs',alias:kind==='browser'?{...alias,react:fixture+'/node_modules/react','react-dom':fixture+'/node_modules/react-dom'}:alias,external:kind==='browser'?[]:['react','react-dom/server'],define:{'process.env.NODE_ENV':JSON.stringify(kind==='bench'?'production':process.env.VPM_REACT_MODE||'production')},logLevel:'silent'});
 }
}
module.exports=base;console.log('Built Material FormControl/FormLabel/FormHelperText consumers');
