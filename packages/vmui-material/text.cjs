"use strict";
const React = require("react");
const system = require("vmui-system");
const h = React.createElement;
const empty = Object.freeze({});
const upper = value => value[0].toUpperCase() + value.slice(1);
const join = (...values) => values.filter(Boolean).join(" ");
const utility = (name, slot) => slot === "focusVisible" ? "Mui-focusVisible" : name + "-" + slot;
const own = (object, key) => object && Object.hasOwn(object, key) ? object[key] : undefined;
const classesFor = (name, slots, custom = empty) => slots.filter(Boolean).map(slot => join(utility(name, slot), own(custom,slot))).join(" ");
const mapping = Object.freeze({h1:"h1",h2:"h2",h3:"h3",h4:"h4",h5:"h5",h6:"h6",subtitle1:"h6",subtitle2:"h6",body1:"p",body2:"p",inherit:"p"});
const metrics = {
  h1:[300,6,1.167,"-0.01562em"],h2:[300,3.75,1.2,"-0.00833em"],h3:[400,3,1.167,"0em"],
  h4:[400,2.125,1.235,"0.00735em"],h5:[400,1.5,1.334,"0em"],h6:[500,1.25,1.6,"0.0075em"],
  subtitle1:[400,1,1.75,"0.00938em"],subtitle2:[500,.875,1.57,"0.00714em"],body1:[400,1,1.5,"0.00938em"],
  body2:[400,.875,1.43,"0.01071em"],button:[500,.875,1.75,"0.02857em"],caption:[400,.75,1.66,"0.03333em"],overline:[400,.75,2.66,"0.08333em"],
};
const fallbackTypography = Object.fromEntries(Object.entries(metrics).map(([key,[fontWeight,size,lineHeight,letterSpacing]]) => [key, {
  fontFamily:'"Roboto", "Helvetica", "Arial", sans-serif',fontWeight,fontSize:size+"rem",lineHeight,letterSpacing,
  ...(["button","overline"].includes(key)?{textTransform:"uppercase"}:{}),
}]));
const fallbackPalette = {
  primary:{main:"#1976d2"},secondary:{main:"#9c27b0"},error:{main:"#d32f2f"},warning:{main:"#ed6c02"},info:{main:"#0288d1"},success:{main:"#2e7d32"},
  text:{primary:"rgba(0,0,0,.87)",secondary:"rgba(0,0,0,.6)",disabled:"rgba(0,0,0,.38)"},action:{active:"rgba(0,0,0,.54)",disabled:"rgba(0,0,0,.26)"},
};
function colorValue(theme, value, icon=false) {
  if (!value || value === "inherit") return value;
  const palette=theme.vars?.palette || theme.palette || fallbackPalette;
  const key=/^text[A-Z]/.test(value) ? "text."+value[4].toLowerCase()+value.slice(5) : value;
  if (icon && (key === "action" || key === "disabled")) return palette.action?.[key === "action" ? "active" : "disabled"];
  const parts=key.split(".");
  const lookup=p=>{let found=p;for(const part of parts)found=found && Object.hasOwn(found,part)?found[part]:undefined;return found;};
  const found=lookup(palette) ?? lookup(fallbackPalette);
  return typeof found === "object" ? found?.main : found ?? (fallbackPalette[key]?.main || value);
}
function defaults(input,name) {
  const resolved=system.useThemeProps({props:input,name,themeId:"$$material"});
  let result=resolved;
  for(const key of Object.keys(resolved)) if(resolved[key]===undefined){if(result===resolved)result={...resolved};delete result[key];}
  return result;
}
const styled=system.createStyled({themeId:"$$material"});
const TextRoot=styled("span",{
  name:"MuiTypography",slot:"Root",
  overridesResolver:({ownerState:s},o)=>[o.root,o[s.variant],s.align!=="inherit"&&o["align"+upper(s.align)],s.noWrap&&o.noWrap,s.gutterBottom&&o.gutterBottom,s.paragraph&&o.paragraph],
})(({theme,ownerState:s})=>({
  margin:0,
  ...(s.variant==="inherit" ? {font:"inherit",lineHeight:"inherit",letterSpacing:"inherit"} : own(theme.typography,s.variant) || own(fallbackTypography,s.variant)),
  ...(s.color ? {color:colorValue(theme,s.color)}:{}),
  ...(s.align!=="inherit"?{textAlign:"var(--Typography-textAlign)"}:{}),
  ...(s.noWrap?{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}:{}),
  ...(s.gutterBottom?{marginBottom:".35em"}:{}),
  ...(s.paragraph?{marginBottom:16}:{}),
}));
const Typography=React.forwardRef(function Typography(input,ref){
  const p=defaults(input,"MuiTypography");
  const {align="inherit",children,classes=empty,className,color,component,gutterBottom=false,noWrap=false,paragraph=false,variant="body1",variantMapping=mapping,...rest}=p;
  const ownerState={...p,align,color,gutterBottom,noWrap,paragraph,variant};
  const Component=component || (paragraph?"p":own(variantMapping,variant) || own(mapping,variant) || "span");
  return h(TextRoot,{...system.extendSxProp(rest),as:Component,ref,ownerState,...(align!=="inherit"?{style:{"--Typography-textAlign":align,...rest.style}}:{}),className:join(classesFor("MuiTypography",["root",variant,align!=="inherit"&&"align"+upper(align),gutterBottom&&"gutterBottom",noWrap&&"noWrap",paragraph&&"paragraph"],classes),className)},children);
});
const LinkRoot=styled(Typography,{
  name:"MuiLink",slot:"Root",
  overridesResolver:({ownerState:s},o)=>[o.root,o["underline"+upper(s.underline)],s.component==="button"&&o.button],
})(({theme,ownerState:s})=>({
  textDecoration:s.underline==="always"?"underline":"none",
  ...(s.underline==="hover"?{"&:hover":{textDecoration:"underline"}}:{}),
  ...(s.underline==="always"?{
    textDecorationColor:"var(--Link-underlineColor)",
    "--Link-underlineColor":s.color==="inherit"?"currentColor":`rgb(from ${colorValue(theme,s.color)} r g b / .4)`,
    "&:hover":{textDecorationColor:"inherit"},
  }:{}),
  ...(s.component==="button"?{
    position:"relative",WebkitTapHighlightColor:"transparent",backgroundColor:"transparent",outline:0,border:0,margin:0,borderRadius:0,padding:0,cursor:"pointer",userSelect:"none",verticalAlign:"middle",MozAppearance:"none",WebkitAppearance:"none",
    "&::-moz-focus-inner":{borderStyle:"none"},"&.Mui-focusVisible":{outline:"auto"},
  }:{}),
}));
const Link=React.forwardRef(function Link(input,ref){
  const p=defaults(input,"MuiLink");
  const {classes=empty,className,component="a",color="primary",underline="always",variant="inherit",TypographyClasses,onFocus,onBlur,...rest}=p;
  const [focused,setFocused]=React.useState(false);
  const ownerState={...p,component,color,underline,variant,focusVisible:focused};
  return h(LinkRoot,{...rest,ref,component,color,variant,ownerState,classes:TypographyClasses,
    className:join(classesFor("MuiLink",["root","underline"+upper(underline),component==="button"&&"button",focused&&"focusVisible"],classes),className),
    onFocus(event){if(event.currentTarget.matches?.(":focus-visible"))setFocused(true);onFocus?.(event);},
    onBlur(event){setFocused(false);onBlur?.(event);},
  });
});
const SvgRoot=styled("svg",{
  name:"MuiSvgIcon",slot:"Root",
  overridesResolver:({ownerState:s},o)=>[o.root,s.color!=="inherit"&&o["color"+upper(s.color)],o["fontSize"+upper(s.fontSize)]],
})(({theme,ownerState:s})=>({
  userSelect:"none",width:"1em",height:"1em",display:"inline-block",flexShrink:0,
  transition:theme.transitions?.create?.("fill",{duration:theme.transitions?.duration?.shorter}) || "fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
  ...(!s.svgChild?{fill:"currentColor"}:{}),
  fontSize:s.fontSize==="inherit"?"inherit":own({small:20,medium:24,large:35},s.fontSize) ? (theme.typography?.pxToRem?.(own({small:20,medium:24,large:35},s.fontSize)) || own({small:"1.25rem",medium:"1.5rem",large:"2.1875rem"},s.fontSize)) : undefined,
  ...(s.color!=="inherit"?{color:colorValue(theme,s.color,true)}:{}),
}));
const SvgIcon=React.forwardRef(function SvgIcon(input,ref){
  const p=defaults(input,"MuiSvgIcon");
  const {children,classes=empty,className,color="inherit",component="svg",fontSize="medium",htmlColor,inheritViewBox=false,titleAccess,viewBox="0 0 24 24",...rest}=p;
  const svgChild=React.isValidElement(children)&&children.type==="svg";
  const childProps=svgChild?children.props:empty;
  const {children:inner,ref:childRef,className:childClass,style:childStyle,...attributes}=childProps;
  // An SVG child supplies geometry/paint; the caller retains explicit root
  // accessibility attributes and refs. The child is never mutated.
  const ownerState={...p,color,fontSize,inheritViewBox,svgChild};
  const props={focusable:"false","aria-hidden":titleAccess?undefined:true,role:titleAccess?"img":undefined,
    ...(!inheritViewBox?{viewBox}:{}),...attributes,...(titleAccess?{"aria-hidden":undefined,role:"img"}:{}),...rest,
    ...(htmlColor!==undefined?{color:htmlColor}:{}),as:component,ref,ownerState,
    className:join(classesFor("MuiSvgIcon",["root",color!=="inherit"&&"color"+upper(color),"fontSize"+upper(fontSize)],classes),childClass,className),
    ...(childStyle?{style:{...childStyle,...rest.style}}:{}),
  };
  return h(SvgRoot,props,svgChild?inner:children,titleAccess?h("title",null,titleAccess):null);
});
SvgIcon.muiName="SvgIcon";
function createSvgIcon(path,displayName){
  const Icon=React.memo(React.forwardRef(function Icon(props,ref){return h(SvgIcon,{...props,ref},path);}));
  Icon.displayName=displayName+"Icon";Icon.muiName=SvgIcon.muiName;
  return Icon;
}
const api={Typography,Link,SvgIcon,createSvgIcon};
const slots={
  Typography:["root",...Object.keys(metrics),"inherit","alignLeft","alignRight","alignCenter","alignJustify","noWrap","gutterBottom","paragraph"],
  Link:["root","underlineNone","underlineHover","underlineAlways","button","focusVisible"],
  SvgIcon:["root","colorPrimary","colorSecondary","colorAction","colorError","colorDisabled","fontSizeInherit","fontSizeSmall","fontSizeMedium","fontSizeLarge"],
};
for(const [name,keys] of Object.entries(slots)){
  api[name].displayName=name;
  api["get"+name+"UtilityClass"]=slot=>utility("Mui"+name,slot);
  api[name[0].toLowerCase()+name.slice(1)+"Classes"]=Object.freeze(Object.fromEntries(keys.map(slot=>[slot,utility("Mui"+name,slot)])));
}
api.iconUtilities = Object.freeze({createSvgIcon});
module.exports=api;
