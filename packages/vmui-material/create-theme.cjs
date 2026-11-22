"use strict";
const system=require("vmui-system"),{deepmerge}=require("vmui-utils");
const {createPalette}=require("./palette.cjs"),{createTypography}=require("./type-scale.cjs"),{createTransitions}=require("./transition-settings.cjs");
const {extendPalette}=require("./theme-colors.cjs"),tokens=require("./theme-tokens.json");
const copy=value=>deepmerge({},value);
const defaultSkip=(path)=>["typography","mixins","breakpoints","transitions","motion","direction","cssVarPrefix","colorSchemeSelector","rootSelector","internal_cache","unstable_sxConfig","colorSpace"].includes(path[0])||path[0]==="palette"&&["mode","contrastThreshold","tonalOffset","colorSpace"].includes(path[1]);
function createTheme(options={},...overrides){
 if(options.vars!==undefined)throw new TypeError("vars is reserved for generated theme variables");
 const {palette:paletteOptions,typography,transitions,mixins,shadows,zIndex,cssVariables,colorSchemes,defaultColorScheme,motion,...rest}=options;
 let theme=system.createTheme(rest);
 theme.unstable_sxConfig.borderRadius={...theme.unstable_sxConfig.borderRadius,themeKey:"shape.borderRadius"};
 theme.palette=createPalette(paletteOptions);
 theme.mixins={toolbar:{minHeight:56,[theme.breakpoints.up("xs")]:{"@media (orientation: landscape)":{minHeight:48}},[theme.breakpoints.up("sm")]:{minHeight:64}},...copy(mixins||{})};
 theme.shadows=shadows?shadows.slice():tokens.shadows.slice();
 theme.typography=createTypography(theme.palette,typography);
 theme.motion={reducedMotion:"never",...motion};
 theme.transitions=createTransitions(transitions);
 theme.zIndex=deepmerge(tokens.zIndex,zIndex);
 theme.alpha=system.alpha;theme.lighten=system.lighten;theme.darken=system.darken;
 for(const extra of overrides)theme=deepmerge(theme,extra);
 const defaultScheme=defaultColorScheme||theme.palette.mode||"light";
 if(!cssVariables){
  if(cssVariables!==undefined)theme.cssVariables=cssVariables;
  if(colorSchemes){
   theme.defaultColorScheme=defaultScheme;
   theme.colorSchemes={};
   for(const [name,input] of Object.entries(colorSchemes))if(input)theme.colorSchemes[name]={...copy(input===true?{}:input),palette:createPalette({mode:name,...(input.palette||{})})};
   theme.colorSchemes[defaultScheme]={...theme.colorSchemes[defaultScheme],palette:theme.palette};
  }
  return theme;
 }
 const config=typeof cssVariables==="object"?cssVariables:{};
 if(config.nativeColor)throw new TypeError("Native color-space themes are not yet supported");
 const prefix=config.cssVarPrefix??"mui",schemes={};
 for(const name of [defaultScheme,...Object.keys(colorSchemes||{}).filter(n=>n!==defaultScheme)]){
  const input=colorSchemes?.[name];
  if(input===false&&name!==defaultScheme)continue;
  const settings=input&&input!==true?input:{};
  const p=createPalette({...settings.palette,mode:settings.palette?.mode||name,...(name===defaultScheme?paletteOptions:{})});
  const dark=p.mode==="dark";
  schemes[name]=deepmerge(settings,{
   palette:extendPalette(p,prefix),
   opacity:deepmerge({inputPlaceholder:dark?.5:.42,inputUnderline:dark?.7:.42,switchTrackDisabled:dark?.2:.12,switchTrack:dark?.3:.38},settings.opacity),
   overlays:settings.overlays|| (dark?Array.from({length:25},(_,i)=>i?"linear-gradient(rgba(255 255 255 / "+Number(((4.5*Math.log(i+1)+2)/100).toFixed(3))+"), rgba(255 255 255 / "+Number(((4.5*Math.log(i+1)+2)/100).toFixed(3))+"))":"none"):[])
  });
 }
 const selector=config.colorSchemeSelector??(Object.keys(schemes).length>1?"media":undefined),root=config.rootSelector||":root";
 Object.assign(theme,{defaultColorScheme:defaultScheme,cssVarPrefix:prefix,colorSchemeSelector:selector,rootSelector:root,colorSchemes:schemes,
  font:system.prepareTypographyVars(theme.typography),getCssVar:system.unstable_createGetCssVar(prefix),shouldSkipGeneratingVar:config.shouldSkipGeneratingVar||defaultSkip});
 const spacingInput=options.spacing??8;
 const data={...theme,spacing:typeof spacingInput==="function"?undefined:spacingInput};
 delete data.palette;
 for(const key of Object.keys(data))if(defaultSkip([key]))delete data[key];
 data.colorSchemes=Object.fromEntries(Object.entries(schemes).map(([name,s])=>[name,{...s,...(!s.overlays.length?{overlays:undefined}:{})}]));
 const prepared=system.prepareCssVars(data,{prefix,defaultColorScheme:defaultScheme,colorSchemeSelector:selector,
  shouldSkipGeneratingVar:theme.shouldSkipGeneratingVar,disableCssColorScheme:config.disableCssColorScheme,
  getSelector(name,css){
   if(name===undefined)return {[root]:css};
   let target=selector==="media"?"@media (prefers-color-scheme: "+name+")":selector==="class"?"."+name:selector==="data"?"[data-"+name+"]":selector?selector.replace(/%s/g,name):root;
   if(name===defaultScheme)target=selector&&selector!=="media"?root+", "+target:root;
   if(name==="dark"&&name===defaultScheme&&selector&&selector!=="media"){
    const own={},common={};
    for(const [key,value]of Object.entries(css)){
     const darkOnly=key.startsWith("--"+(prefix?prefix+"-":"")+"overlays-")||key==="--"+(prefix?prefix+"-":"")+"palette-AppBar-darkBg"||key==="--"+(prefix?prefix+"-":"")+"palette-AppBar-darkColor";
     (darkOnly?own:common)[key]=value;
    }
    const darkTarget=selector==="class"?".dark":selector==="data"?"[data-dark]":selector.replace(/%s/g,"dark");
    return {[darkTarget]:own,[target]:common};
   }
   return target.startsWith("@")?{[target]:{[root]:css}}:{[target]:css};
  }});
 const prune=value=>{
  if(!value||typeof value!=="object")return value;
  const out=Array.isArray(value)?[]:{};
  for(const [key,child] of Object.entries(value)){
   const v=prune(child);if(v&&typeof v==="object"&&!Object.keys(v).length)continue;out[key]=v;
  }return out;
 };
 const generate=prepared.generateThemeVars;
 prepared.vars=prune(prepared.vars);prepared.generateThemeVars=()=>prune(generate());
 Object.assign(theme,prepared,schemes[defaultScheme]);
 theme.generateSpacing=function(){
  if(typeof spacingInput==="function")return system.createSpacing(spacingInput);
  const variable=this.vars?.spacing;
  if(Array.isArray(spacingInput))return system.createSpacing(spacingInput,n=>typeof n==="string"?n:n<0?"calc(-1 * "+variable[-n]+")":variable[n]);
  return system.createSpacing(variable||spacingInput);
 };
 theme.spacing=theme.generateSpacing();
 theme.getColorSchemeSelector=system.createGetColorSchemeSelector(selector);
 return theme;
}
module.exports={createTheme,defaultSkip};
