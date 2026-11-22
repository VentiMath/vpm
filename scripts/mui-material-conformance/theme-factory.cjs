"use strict";
const path=require("node:path"),{packages,fixture,esbuild}=require("./paths.cjs");
module.exports=function load(relative="create-theme.cjs"){
 const entry=path.join(packages,"vmui-material",relative);
 if(process.env.VPM_MATERIAL_INSTALL)return require(entry);
 const output=esbuild.buildSync({entryPoints:[entry],platform:"node",bundle:true,format:"cjs",write:false,nodePaths:[packages,fixture+"/node_modules"]});
 const m={exports:{}};require("node:vm").compileFunction(output.outputFiles[0].text,["module","exports","require"])(m,m.exports,require);return m.exports;
};
