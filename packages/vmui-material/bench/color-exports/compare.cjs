"use strict";
const assert=require("node:assert/strict"),path=require("node:path");
const {peer,esbuild}=require("../../../../scripts/mui-material-conformance/paths.cjs");
const caller=require("../../../../scripts/mui-material-conformance/fixtures/color-caller.json");
const root=path.resolve(__dirname,"../.."),upstream=peer.resolve("mui-material-app/colors"),vpm=root+"/colors/index.cjs";
const cases=[{
 name:"Unchanged FuseUtils random color",
 make(lib){
  const js=esbuild.transformSync("class FuseUtils {"+caller.method+"}\nreturn FuseUtils;",{loader:"ts",target:"es2022"}).code;
  const Type=new Function("colors",js)(require(lib));
  return ()=>Type.randomMatColor();
 },
 validate(value){assert.match(value,/^#[a-f0-9]{6}$/)}
},{
 name:"Named ramp lookup",
 make(lib){const {blue,grey}=require(lib);let index=0;const shades=[50,100,200,300,400,500,600,700,800,900,"A100","A200","A400","A700"];return ()=> (++index&1?blue:grey)[shades[index%shades.length]]},
 validate(value){assert.match(value,/^#[a-f0-9]{6}$/)}
}];
require("../../../../scripts/bench-process.cjs").run({root,upstream,vpm,cases,files:["colors","bench/color-exports/compare.cjs","../../scripts/mui-material-conformance/fixtures/color-caller.json",path.relative(root,upstream)]}).catch(error=>{console.error(error);process.exitCode=1});
