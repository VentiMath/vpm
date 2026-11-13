"use strict";
const fs=require('node:fs'),path=require('node:path');
const fixture=path.resolve(__dirname,'../mui-system-conformance'),out=fixture+'/node_modules/.vpm-motion-react';
const {createRequire}=require('node:module'),peer=createRequire(fixture+'/package.json'),esbuild=peer('esbuild');
const root=path.resolve(__dirname,'../..');
for(const variant of ['current','app','vpm']){
 const alias=require('../mui-system-conformance/aliases.cjs')(true);
 if(process.env.VPM_MOTION_INSTALL)for(const key of Object.keys(alias))alias[key]=alias[key].replace(root+'/packages',process.env.VPM_MOTION_INSTALL+'/node_modules');
 alias['@motion']=variant==='vpm'?(process.env.VPM_MOTION_INSTALL?process.env.VPM_MOTION_INSTALL+'/node_modules':root+'/packages')+'/vmotion/react.cjs':path.resolve(__dirname,'../motion-utils-conformance/node_modules',variant==='current'?'framer-motion':'framer-motion-app');
 alias.react=fixture+'/node_modules/react';alias['react-dom']=fixture+'/node_modules/react-dom';fs.mkdirSync(out,{recursive:true});
 for(const browser of [false,true]){
 const options=browser?{entryPoints:[__dirname+'/entry.jsx']}:{stdin:{contents:'const React=require("react");const {renderToString}=require("react-dom/server");const {SSRScene}=require("./scene.jsx");module.exports={React,renderToString,api:require("@motion"),prepare:(kind,count=12)=>{const tree=React.createElement(SSRScene,{kind,count});return()=>renderToString(tree)}};',resolveDir:__dirname}};
 esbuild.buildSync({...options,outfile:out+'/'+variant+(browser?'.js':'.cjs'),bundle:true,platform:browser?'browser':'node',format:browser?'iife':'cjs',alias,define:{'process.env.NODE_ENV':JSON.stringify(process.env.VPM_REACT_MODE||'production')},logLevel:'silent'});
 }
}
module.exports=out;console.log('Built current/app and independent Motion React consumers');
