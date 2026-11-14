"use strict";
const React = require("react");
const { styled, useTheme, useThemeProps } = require("./theme.cjs");
const h = React.createElement, empty = Object.freeze({});
const own = (object,key) => object && Object.hasOwn(object,key) ? object[key] : undefined;
const upper = value => value[0].toUpperCase()+value.slice(1);
const join = (...parts) => parts.filter(Boolean).join(" ");
const classes = (name,slots,custom) => slots.filter(Boolean).map(slot=>join(name+"-"+slot,own(custom,slot))).join(" ");
function defaults(props,name) {
 const resolved=useThemeProps({props,name}), result={};
 for(const key of Object.keys(resolved))if(resolved[key]!==undefined)result[key]=resolved[key];
 return result;
}
// Standard Material shadow geometry is design data observed through the public
// default-theme API. Components and rendering logic are independently written.
const shadowGeometry = [[[0,2,1,-1],[0,1,1,0],[0,1,3,0]],[[0,3,1,-2],[0,2,2,0],[0,1,5,0]],[[0,3,3,-2],[0,3,4,0],[0,1,8,0]],[[0,2,4,-1],[0,4,5,0],[0,1,10,0]],[[0,3,5,-1],[0,5,8,0],[0,1,14,0]],[[0,3,5,-1],[0,6,10,0],[0,1,18,0]],[[0,4,5,-2],[0,7,10,1],[0,2,16,1]],[[0,5,5,-3],[0,8,10,1],[0,3,14,2]],[[0,5,6,-3],[0,9,12,1],[0,3,16,2]],[[0,6,6,-3],[0,10,14,1],[0,4,18,3]],[[0,6,7,-4],[0,11,15,1],[0,4,20,3]],[[0,7,8,-4],[0,12,17,2],[0,5,22,4]],[[0,7,8,-4],[0,13,19,2],[0,5,24,4]],[[0,7,9,-4],[0,14,21,2],[0,5,26,4]],[[0,8,9,-5],[0,15,22,2],[0,6,28,5]],[[0,8,10,-5],[0,16,24,2],[0,6,30,5]],[[0,8,11,-5],[0,17,26,2],[0,6,32,5]],[[0,9,11,-5],[0,18,28,2],[0,7,34,6]],[[0,9,12,-6],[0,19,29,2],[0,7,36,6]],[[0,10,13,-6],[0,20,31,3],[0,8,38,7]],[[0,10,13,-6],[0,21,33,3],[0,8,40,7]],[[0,10,14,-6],[0,22,35,3],[0,8,42,7]],[[0,11,14,-7],[0,23,36,3],[0,9,44,8]],[[0,11,15,-7],[0,24,38,3],[0,9,46,8]]];
const defaultShadows = ["none",...shadowGeometry.map(layers=>layers.map((layer,i)=>layer.map(v=>v+"px").join(" ")+" rgba(0,0,0,"+[.2,.14,.12][i]+")").join(","))];
const PaperRoot=styled("div",{
 name:"MuiPaper",slot:"Root",
 overridesResolver:({ownerState:s},o)=>[o.root,own(o,s.variant),!s.square&&o.rounded,s.variant==="elevation"&&o["elevation"+s.elevation]],
})(({theme,ownerState:s})=>({
 backgroundColor:(theme.vars?.palette||theme.palette).background.paper,
 color:(theme.vars?.palette||theme.palette).text.primary,
 transition:theme.transitions?.create?.("box-shadow")||"box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
 ...(!s.square?{borderRadius:theme.shape.borderRadius}:{}),
 ...(s.variant==="outlined"?{border:"1px solid "+(theme.vars?.palette||theme.palette).divider}:{}),
 ...(s.variant==="elevation"?{boxShadow:"var(--Paper-shadow)",backgroundImage:"var(--Paper-overlay)"}:{}),
}));
const Paper=React.forwardRef(function Paper(input,ref){
 const p=defaults(input,"MuiPaper"),theme=useTheme();
 const {children,classes:custom=empty,className,component="div",elevation=1,square=false,variant="elevation",style,...rest}=p;
 if(!Number.isInteger(elevation)||elevation<0||elevation>24)throw new RangeError("Paper elevation must be an integer from 0 to 24");
 const ownerState={...p,elevation,square,variant};
 let visual;
 if(variant==="elevation"){
  visual={"--Paper-shadow":theme.vars?.shadows?.[elevation] ?? theme.shadows?.[elevation] ?? defaultShadows[elevation]};
  if(theme.vars)visual["--Paper-overlay"]=theme.vars.overlays?.[elevation];
  else if(theme.palette.mode==="dark"){
   const alpha=elevation===0?0:Number(((4.5*Math.log(elevation+1)+2)/100).toFixed(3));
   visual["--Paper-overlay"]=`linear-gradient(rgba(255, 255, 255, ${alpha}), rgba(255, 255, 255, ${alpha}))`;
  }
 }
 return h(PaperRoot,{...rest,as:component,ref,ownerState,style:{...visual,...style},className:join(classes("MuiPaper",["root",variant,!square&&"rounded",variant==="elevation"&&"elevation"+elevation],custom),className)},children);
});
const DividerRoot=styled("div",{
 name:"MuiDivider",slot:"Root",
 overridesResolver:({ownerState:s},o)=>[o.root,own(o,s.variant),s.absolute&&o.absolute,s.flexItem&&o.flexItem,s.light&&o.light,s.orientation==="vertical"&&o.vertical,s.hasChildren&&o.withChildren,s.hasChildren&&s.orientation==="vertical"&&o.withChildrenVertical,s.hasChildren&&s.textAlign!=="center"&&o["textAlign"+upper(s.textAlign)]],
})(({theme,ownerState:s})=>{
 const vertical=s.orientation==="vertical",palette=theme.vars?.palette||theme.palette;
 const border=s.light?`rgb(from ${palette.divider} r g b / .08)`:palette.divider;
 const result={margin:0,flexShrink:0,borderWidth:0,borderStyle:"solid",borderColor:border,borderBottomWidth:"thin"};
 if(s.absolute)Object.assign(result,{position:"absolute",bottom:0,left:0,width:"100%"});
 if(s.variant==="inset")result.marginLeft=72;
 if(s.variant==="middle")Object.assign(result,vertical?{marginTop:theme.spacing(1),marginBottom:theme.spacing(1)}:{marginLeft:theme.spacing(2),marginRight:theme.spacing(2)});
 if(vertical)Object.assign(result,{height:"100%",borderBottomWidth:0,borderRightWidth:"thin"});
 if(s.flexItem)Object.assign(result,{alignSelf:"stretch",height:"auto"});
 if(s.hasChildren){
  Object.assign(result,{display:"flex",textAlign:"center",border:0,borderTopStyle:"solid",borderLeftStyle:"solid"});
  const pseudo={content:'""',alignSelf:"center",...(vertical?{height:"100%",borderLeft:"thin solid "+border,borderLeftStyle:"inherit"}:{width:"100%",borderTop:"thin solid "+border,borderTopStyle:"inherit"})};
  result["&::before, &::after"]=pseudo;
  if(vertical)result.flexDirection="column";
  else if(s.textAlign!=="center"){
   const left=s.textAlign==="left";result["&::before"]={width:left?"10%":"90%"};result["&::after"]={width:left?"90%":"10%"};
  }
 }
 return result;
});
const DividerWrapper=styled("span",{name:"MuiDivider",slot:"Wrapper",overridesResolver:({ownerState:s},o)=>[o.wrapper,s.orientation==="vertical"&&o.wrapperVertical]})(({theme,ownerState:s})=>{
 const padding=`calc(${theme.spacing(1)} * 1.2)`;
 return {display:"inline-block",paddingLeft:padding,paddingRight:padding,whiteSpace:"nowrap",...(s.orientation==="vertical"?{paddingTop:padding,paddingBottom:padding}:{})};
});
const Divider=React.forwardRef(function Divider(input,ref){
 const p=defaults(input,"MuiDivider");
 const {children,classes:custom=empty,className,component,absolute=false,flexItem=false,light=false,orientation="horizontal",textAlign="center",variant="fullWidth",role,...rest}=p;
 const hasChildren=Boolean(children),Component=component||(hasChildren||orientation==="vertical"?"div":"hr");
 const resolvedRole=role===undefined&&Component!=="hr"?"separator":role;
 const ownerState={...p,absolute,flexItem,light,orientation,textAlign,variant,hasChildren};
 return h(DividerRoot,{role:resolvedRole,...(resolvedRole==="separator"?{"aria-orientation":orientation}:{}),...rest,as:Component,ref,ownerState,className:join(classes("MuiDivider",["root",variant,absolute&&"absolute",light&&"light",orientation==="vertical"&&"vertical",flexItem&&"flexItem",hasChildren&&"withChildren",hasChildren&&orientation==="vertical"&&"withChildrenVertical",hasChildren&&textAlign!=="center"&&"textAlign"+upper(textAlign)],custom),className)},hasChildren?h(DividerWrapper,{ownerState,className:classes("MuiDivider",["wrapper",orientation==="vertical"&&"wrapperVertical"],custom)},children):null);
});
const IconRoot=styled("span",{
 name:"MuiIcon",slot:"Root",overridesResolver:({ownerState:s},o)=>[o.root,s.color!=="inherit"&&o["color"+upper(s.color)],o["fontSize"+upper(s.fontSize)]],
})(({theme,ownerState:s})=>{
 const palette=theme.vars?.palette||theme.palette;
 const color=s.color==="action"?palette.action?.active:s.color==="disabled"?palette.action?.disabled:own(palette,s.color)?.main;
 const size=own({small:20,medium:24,large:36},s.fontSize);
 return {userSelect:"none",width:"1em",height:"1em",overflow:"hidden",display:"inline-block",textAlign:"center",flexShrink:0,fontSize:s.fontSize==="inherit"?"inherit":size?theme.typography?.pxToRem?.(size)||size/16+"rem":undefined,...(color?{color}:{})};
});
const Icon=React.forwardRef(function Icon(input,ref){
 const p=defaults(input,"MuiIcon");
 const {children,classes:custom=empty,className,component="span",baseClassName="material-icons",color="inherit",fontSize="medium",...rest}=p;
 return h(IconRoot,{"aria-hidden":true,...rest,as:component,ref,ownerState:{...p,color,fontSize},className:join(baseClassName,"notranslate",classes("MuiIcon",["root",color!=="inherit"&&"color"+upper(color),"fontSize"+upper(fontSize)],custom),className)},children);
});
Icon.muiName="Icon";
const api={Paper,Divider,Icon};
for(const [name,slots]of Object.entries({Paper:["root","rounded","outlined","elevation",...Array.from({length:25},(_,i)=>"elevation"+i)],Divider:["root","absolute","fullWidth","inset","middle","flexItem","light","vertical","withChildren","withChildrenVertical","textAlignLeft","textAlignRight","wrapper","wrapperVertical"],Icon:["root","colorPrimary","colorSecondary","colorAction","colorError","colorDisabled","fontSizeInherit","fontSizeSmall","fontSizeMedium","fontSizeLarge"]})){
 api[name].displayName=name;api["get"+name+"UtilityClass"]=slot=>"Mui"+name+"-"+slot;
 api[name[0].toLowerCase()+name.slice(1)+"Classes"]=Object.freeze(Object.fromEntries(slots.map(slot=>[slot,"Mui"+name+"-"+slot])));
}
module.exports=api;
