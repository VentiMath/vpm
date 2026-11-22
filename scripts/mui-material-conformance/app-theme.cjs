"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),{compileFunction}=require("node:vm"),{peer,esbuild}=require("./paths.cjs");
module.exports=function setup(api){
 const app=process.env.VPM_APP_CHECKOUT;if(!app)throw Error("VPM_APP_CHECKOUT required");
 const source=name=>execFileSync("git",["show",(process.env.VPM_APP_REF||"origin/main")+":"+name],{cwd:app,encoding:"utf8"});
 function run(text,imports){const js=esbuild.transformSync(text,{loader:"ts",format:"cjs"}).code,m={exports:{}};compileFunction(js,["module","exports","require"])(m,m.exports,name=>{assert.ok(Object.hasOwn(imports,name),name);return imports[name]});return m.exports}
 const colors={"@mui/material/colors":peer("mui-material-app/colors")};
 for(const name of ["fuseDark","paletteText","skyBlue","themesConfig"])colors["./"+name]=run(source("src/@fuse/colors/"+name+".ts"),colors);
 const settings=run(source("src/@fuse/default-settings/FuseDefaultSettings.ts"),{"@mui/material/styles":api,qs:{}});
 let body=source("src/@fuse/core/FuseSettings/hooks/fuseThemeHooks.tsx");
 body=body.slice(body.indexOf("const MIN_TEXT_CONTRAST"),body.indexOf("// Custom hooks for selecting themes"));
 const names=["createTheme","darken","decomposeColor","getContrastRatio","getLuminance","hslToRgb","lighten","_","defaultThemeOptions","mustHaveThemeOptions","extendThemeWithMixins"];
 const imports=names.map(name=>name==="_"?require(path.join(app,"node_modules/lodash")):api[name]||settings[name]);
 const js=esbuild.transformSync(body,{loader:"ts"}).code.replace("export ","");
 const generate=compileFunction(js+";return generateMuiTheme;",names)(...imports);
 return {generate,themes:Object.values(colors["./themesConfig"].themesConfig)};
};
if(require.main===module){
 const current=peer("@mui/material/styles"),legacy=peer("mui-material-app/styles");
 const owned=require("./theme-factory.cjs")("styles/index.cjs"),a=module.exports(owned),b=module.exports(current),old=module.exports(legacy);
 const data=x=>JSON.parse(JSON.stringify(x));
 let count=0;
 for(const theme of a.themes)for(const direction of ["ltr","rtl"])for(const prefix of [undefined,"navbar","toolbar"]){
  const aa=a.generate(theme,direction,prefix),bb=b.generate(theme,direction,prefix),cc=old.generate(theme,direction,prefix);
  assert.deepEqual(data(aa),data(bb));assert.deepEqual(aa.generateStyleSheets(),bb.generateStyleSheets());
  for(const name of ["border","borderLeft","borderRight","borderTop","borderBottom"])for(const width of [0,1,3]){
   assert.deepEqual(aa.mixins[name](width),bb.mixins[name](width));assert.deepEqual(aa.mixins[name](width),cc.mixins[name](width));
  }
  for(const role of ["primary","secondary","error","warning","info","success"])assert.deepEqual(aa.palette[role],cc.palette[role]);
  count++;
 }
 console.log(count+" unchanged app theme builds and border mixins match, across "+a.themes.length+" presets.");
}
