"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),crypto=require("node:crypto");
const {peer,packages,esbuild}=require("./paths.cjs");
const own=require(packages+"/vmui-material/colors/index.cjs");
const names=Object.keys(own).sort();
assert.equal(names.length,20);
const caller=require("./fixtures/color-caller.json");
assert.equal(crypto.createHash("sha256").update(caller.method).digest("hex"),caller.methodSha256);
const js=esbuild.transformSync("class FuseUtils {"+caller.method+"}\nresult = FuseUtils;",{loader:"ts",target:"es2022"}).code;
function run(colors,index,hue){
 const context={colors,result:null,Math:Object.assign(Object.create(Math),{random:()=>index/16})};
 vm.runInNewContext(js,context);return context.result.randomMatColor(hue);
}
let comparisons=0;
for(const control of ["mui-material-app","@mui/material","mui-material-current"]){
 const other=peer(control+"/colors");
 assert.deepEqual(names,Object.keys(other).sort());
 for(const name of names){
  assert.deepEqual(own[name],other[name],control+"/"+name);
  assert.equal(require(packages+"/vmui-material/colors/"+name+".cjs").default,own[name]);
 }
 for(let index=0;index<16;index++)for(const hue of [undefined,...Object.keys(own.red)]){
  assert.equal(run(own,index,hue),run(other,index,hue));comparisons++;
 }
}
(async()=>{
 const esm=await import(packages+"/vmui-material/colors/index.mjs");
 assert.deepEqual(Object.keys(esm).sort(),names);
 for(const name of names){
  assert.equal(esm[name],own[name]);
  assert.equal((await import(packages+"/vmui-material/colors/"+name+".mjs")).default,own[name]);
 }
 // The static entry must not pull React, the theme factory or any VPM package.
 const built=esbuild.buildSync({stdin:{contents:'export { default } from "'+packages+'/vmui-material/colors/red.mjs"',resolveDir:__dirname},bundle:true,platform:"browser",format:"esm",write:false,metafile:true});
 assert.ok(Object.keys(built.metafile.inputs).every(p=>p==="<stdin>"||/colors\/red(?:\.data)?\.(?:cjs|mjs)$/.test(p)));
 console.log(`20 color exports, CJS/ESM identity, isolated subpath bundle and ${comparisons} unchanged FuseUtils calls match Material 7.2/9.5/9.6.`);
})().catch(error=>{console.error(error);process.exitCode=1});
