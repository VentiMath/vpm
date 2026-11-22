"use strict";
const fs=require("node:fs"),path=require("node:path"),{fixture,packages,esbuild}=require("./paths.cjs");
const base=path.join(fixture,"node_modules/.vpm-material");
for(const version of ["app","current"])for(const own of [false,true]){
 const dir=base+"/"+version+(own?"-vpm":"-upstream");fs.mkdirSync(dir,{recursive:true});
 const material=own?packages+"/vmui-material":fixture+"/node_modules/"+(version==="app"?"mui-material-app":"@mui/material");
 esbuild.buildSync({entryPoints:[__dirname+"/theme-browser-entry.jsx"],outfile:dir+"/theme-browser.js",bundle:true,platform:"browser",format:"iife",nodePaths:[packages,fixture+"/node_modules"],alias:{"@assembly":material+"/styles/index."+ (own?"mjs":"js"),"@components":material+"/index."+(own?"mjs":"js"),react:fixture+"/node_modules/react","react-dom":fixture+"/node_modules/react-dom"},define:{"process.env.NODE_ENV":'"production"'},logLevel:"silent"});
}
