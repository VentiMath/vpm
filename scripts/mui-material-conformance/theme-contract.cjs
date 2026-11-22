"use strict";
const assert=require("node:assert/strict"),{peer}=require("./paths.cjs"),{createTheme}=require("./theme-factory.cjs")();
const current=peer("@mui/material/styles").createTheme,legacy=peer("mui-material-app/styles").createTheme;
const data=x=>JSON.parse(JSON.stringify(x));
const options=[];
for(const mode of ["light","dark"])for(const cssVariables of [false,true,{cssVarPrefix:"toolbar"},{cssVarPrefix:"navbar",colorSchemeSelector:"class",rootSelector:"#preview"}]){
 options.push({palette:{mode},cssVariables});
 options.push({palette:{mode,primary:{main:"#385d9a"},background:{paper:"#e9e2d1",default:"#f1f1f1"},divider:"rgba(20, 40, 60, 0.2)"},typography:{fontFamily:"Geist,Arial,sans-serif",fontSize:13},direction:"rtl",spacing:4,shape:{borderRadius:8},cssVariables});
}
options.push({cssVariables:{cssVarPrefix:"",colorSchemeSelector:"class"},palette:{mode:"dark"}},
 {cssVariables:true,colorSchemes:{light:true,dark:true}},
 {cssVariables:{colorSchemeSelector:"data",disableCssColorScheme:true},colorSchemes:{light:true,dark:{palette:{primary:{main:"#38298a"}}}},defaultColorScheme:"dark"},
 {cssVariables:true,spacing:[0,4,8,16]},
 {spacing:n=>n*6,mixins:{toolbar:{minHeight:48},border:n=>({borderWidth:n})},transitions:{duration:{standard:400}}},
 {cssVariables:true,spacing:n=>n*6,custom:{label:"example",size:12}});
const cleanLegacy=t=>{
 t=data(t);delete t.motion;delete t.internal_cache;delete t.colorSpace;delete t.breakpoints.internal_mediaKeys;
 delete t.unstable_sxConfig?.borderRadius?.themeKey;
 for(const container of [t,t.vars,...Object.values(t.colorSchemes||{})])if(container?.palette){delete container.palette.Input;delete container.palette.Skeleton;}
 return t;
};
for(const input of options){
 const before=data(input),a=createTheme(input),b=current(input);
 assert.deepEqual(data(a),data(b),JSON.stringify(input));
 assert.deepEqual(data(input),before);
 for(const values of [[0],[1],[-2],["auto"],[0,1,-2]])assert.equal(a.spacing(...values),b.spacing(...values));
 for(const mode of ["light","dark"])assert.deepEqual(a.applyStyles(mode,{color:"red"}),b.applyStyles(mode,{color:"red"}));
 assert.deepEqual(a.unstable_sx({px:2,borderRadius:1,color:"primary.main"}),b.unstable_sx({px:2,borderRadius:1,color:"primary.main"}));
 if(a.vars){assert.deepEqual(a.generateStyleSheets(),b.generateStyleSheets());assert.deepEqual(a.generateThemeVars(),b.generateThemeVars())}
 // New current Material tokens are verified above; the app control predates them.
 assert.deepEqual(cleanLegacy(a),cleanLegacy(legacy(input)));
}
const input={palette:{primary:{main:"#123456"}},components:{MuiButton:{defaultProps:{size:"small"}}},shadows:Array(25).fill("none")};
const a=createTheme(input),b=createTheme(input);a.palette.primary.main="changed";a.components.MuiButton.defaultProps.size="large";a.shadows[0]="changed";
assert.equal(b.palette.primary.main,"#123456");assert.equal(input.components.MuiButton.defaultProps.size,"small");assert.equal(b.shadows[0],"none");
assert.throws(()=>createTheme({vars:{}}),TypeError);
console.log(options.length+" theme-assembly cases match current/app controls, with generated sheets, spacing, sx and isolation checked.");
