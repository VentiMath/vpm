'use strict';
const React=require('react'),{styled,useThemeProps}=require('./theme.cjs'),{Paper}=require('./surfaces.cjs');
const h=React.createElement,upper=s=>s[0].toUpperCase()+s.slice(1),join=(...s)=>s.filter(Boolean).join(' ');
function defaults(props,name){const p=useThemeProps({props,name}),result={};for(const k of Object.keys(p))if(p[k]!==undefined)result[k]=p[k];return result;}
function classes(name,slots,custom){return slots.filter(Boolean).map(slot=>join('Mui'+name+'-'+slot,custom?.[slot])).join(' ');}
const AppBarRoot=styled(Paper,{name:'MuiAppBar',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o['position'+upper(s.position)],o['color'+upper(s.color)]]})(({theme,ownerState:s})=>{
 const palette=theme.vars?.palette||theme.palette, anchored=['fixed','absolute','sticky'].includes(s.position);
 const css={display:'flex',flexDirection:'column',width:'100%',boxSizing:'border-box',flexShrink:0,position:s.position,...(anchored?{zIndex:theme.vars?.zIndex?.appBar??theme.zIndex?.appBar??1100,top:0,left:'auto',right:0}:{}),...(s.position==='fixed'?{'@media print':{position:'absolute'}}:{})};
 const dark=theme.palette.mode==='dark';
 if(s.color==='inherit') {css['--AppBar-color']='inherit';css.color='var(--AppBar-color)';return css;}
 if(s.color==='transparent') {
  Object.assign(css,{'--AppBar-background':'transparent','--AppBar-color':'inherit',backgroundColor:'var(--AppBar-background)',color:'var(--AppBar-color)'});
  if(theme.applyStyles) return [css,theme.applyStyles('dark',{backgroundImage:'none'})];
  if(dark)css.backgroundImage='none';return css;
 }
 if(s.color==='default') {
  css['--AppBar-background']=palette.AppBar?.defaultBg??theme.palette.grey?.[dark?900:100]??(dark?'#212121':'#f5f5f5');
  css['--AppBar-color']=palette.text.primary;
 }else if(Object.hasOwn(palette,s.color)&&palette[s.color]?.main){
  css['--AppBar-background']=palette[s.color].main;
  css['--AppBar-color']=palette[s.color].contrastText??(s.color==='warning'&&dark?'rgba(0, 0, 0, 0.87)':'#fff');
 }
 if(theme.vars){
  css.backgroundColor='var(--AppBar-background)';css.color='var(--AppBar-color)';
  if(!s.enableColorOnDark){
   const prefix=theme.cssVarPrefix??'mui',darkCss={backgroundColor:`var(--${prefix?prefix+'-':''}palette-AppBar-darkBg, var(--AppBar-background))`,color:`var(--${prefix?prefix+'-':''}palette-AppBar-darkColor, var(--AppBar-color))`};
   if(theme.applyStyles)return [css,theme.applyStyles('dark',darkCss)];
   if(dark)Object.assign(css,darkCss);
  }
 }else if(!dark||s.enableColorOnDark){css.backgroundColor='var(--AppBar-background)';css.color='var(--AppBar-color)';}
 return css;
});
const AppBar=React.forwardRef(function AppBar(input,ref){
 const p=defaults(input,'MuiAppBar'),{children,classes:custom,className,color='primary',position='fixed',enableColorOnDark=false,...rest}=p;
 return h(AppBarRoot,{square:true,component:'header',elevation:4,...rest,ref,ownerState:{...p,color,position,enableColorOnDark},className:join(classes('AppBar',['root','color'+upper(color),'position'+upper(position)],custom),className,position==='fixed'&&'mui-fixed')},children);
});
const ToolbarRoot=styled('div',{name:'MuiToolbar',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,!s.disableGutters&&o.gutters,o[s.variant]]})(({theme,ownerState:s})=>{
 const up=theme.breakpoints.up('sm'),css={position:'relative',display:'flex',alignItems:'center'};
 if(!s.disableGutters)Object.assign(css,{paddingLeft:theme.spacing(2),paddingRight:theme.spacing(2),[up]:{paddingLeft:theme.spacing(3),paddingRight:theme.spacing(3)}});
 const sizing=s.variant==='dense'?{minHeight:48}:s.variant==='regular'?(theme.mixins?.toolbar??{minHeight:56,[theme.breakpoints.up('xs')]:{'@media (orientation: landscape)':{minHeight:48}},[up]:{minHeight:64}}):{};
 // Keep the mixin's media-query order: landscape comes before the wider
 // breakpoint. Merging keys into the gutter object reverses that precedence.
 return [css,sizing];
});
const Toolbar=React.forwardRef(function Toolbar(input,ref){
 const p=defaults(input,'MuiToolbar'),{children,classes:custom,className,component='div',disableGutters=false,variant='regular',...rest}=p;
 return h(ToolbarRoot,{...rest,as:component,ref,ownerState:{...p,disableGutters,variant},className:join(classes('Toolbar',['root',!disableGutters&&'gutters',variant],custom),className)},children);
});
const api={AppBar,Toolbar};
for(const [name,slots]of Object.entries({AppBar:['root',...['fixed','absolute','sticky','static','relative'].map(x=>'position'+upper(x)),...['default','primary','secondary','inherit','transparent','error','info','success','warning'].map(x=>'color'+upper(x))],Toolbar:['root','gutters','regular','dense']})){
 api[name].displayName=name;api['get'+name+'UtilityClass']=slot=>'Mui'+name+'-'+slot;api[name[0].toLowerCase()+name.slice(1)+'Classes']=Object.freeze(Object.fromEntries(slots.map(slot=>[slot,'Mui'+name+'-'+slot])));
}
module.exports=api;
