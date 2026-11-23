'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture,packages,esbuild}=require('./paths.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-icon-ids-'));
try {
 for(const mode of ['development','production'])for(const version of ['app','current']){
  const results=[];
  for(const own of [false,true]){
   const file=temp+'/'+mode+'-'+version+'-'+own+'.cjs';
   const alias=require('../mui-system-conformance/aliases.cjs')(own,version);
   if(own)for(const key of Object.keys(alias)){const packed=alias[key].replace(path.resolve(__dirname,'../../packages'),packages);if(fs.existsSync(packed))alias[key]=packed}
   const entry=own?packages+'/vmui-material/index.cjs':alias['@mui/material']+'/index.js';
   esbuild.buildSync({stdin:{contents:`import React from 'react';import {renderToStaticMarkup as render} from 'react-dom/server';import {createSvgIcon} from ${JSON.stringify(entry)};const Icon=createSvgIcon(React.createElement('path',{d:'M0 0h1v1z'}),'ChevronLeft');module.exports=[{}, {'data-testid':'caller'}, {'data-testid':undefined}].map(p=>render(React.createElement(Icon,p)).match(/data-testid="([^"]*)"/)?.[1]??null);`,resolveDir:__dirname},bundle:true,platform:'node',format:'cjs',outfile:file,nodePaths:[packages,fixture+'/node_modules'],alias:{...alias,react:fixture+'/node_modules/react','react-dom':fixture+'/node_modules/react-dom'},define:{'process.env.NODE_ENV':JSON.stringify(mode)},logLevel:'silent'});
   results.push(require(file));
  }
  assert.deepEqual(results[1],results[0],mode+' '+version);
  assert.deepEqual(results[1],[mode==='production'?null:'ChevronLeftIcon','caller',null]);
 }
 console.log('Development/production icon identifiers and caller overrides match both Material controls.');
}finally{esbuild.stop();fs.rmSync(temp,{recursive:true,force:true})}
