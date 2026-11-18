'use strict';
const React=require('react'),{styled,useTheme,useThemeProps}=require('./theme.cjs'),{lighten,darken}=require('vmui-system');
const h=React.createElement,empty=Object.freeze({}),cap=s=>s[0].toUpperCase()+s.slice(1),join=(...s)=>s.filter(Boolean).join(' ');
const utility=slot=>'MuiLinearProgress-'+slot;
const keys=['root','colorPrimary','colorSecondary','determinate','indeterminate','buffer','query','dashed','bar','bar1','bar2'];
const linearProgressClasses=Object.freeze(Object.fromEntries(keys.map(k=>[k,utility(k)])));
const classes=(slots,custom)=>slots.filter(Boolean).map(k=>join(utility(k),Object.hasOwn(custom,k)&&custom[k])).join(' ');
const reduce='@media (prefers-reduced-motion: reduce)';
function colors(theme,color){
 if(color==='inherit')return {main:'currentColor',track:'currentColor'};
 const palette=theme.vars?.palette||theme.palette,entry=Object.hasOwn(palette,color)?palette[color]:undefined;
 const main=entry?.main||'currentColor',token=palette.LinearProgress?.[color+'Bg'];
 return {main,track:theme.vars?token:(main==='currentColor'?main:(theme.palette.mode==='dark'?darken(main,.5):lighten(main,.62)))};
}
const Root=styled('span',{name:'MuiLinearProgress',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o['color'+cap(s.color)],o[s.variant]]})(({theme,ownerState:s})=>({
 position:'relative',overflow:'hidden',display:'block',height:4,zIndex:0,
 backgroundColor:s.variant==='buffer'?'transparent':s.color==='inherit'?undefined:colors(theme,s.color).track,
 ...(s.color==='inherit'&&s.variant!=='buffer'?{'&::before':{content:'""',position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'currentColor',opacity:.3}}:{}),
 ...(s.variant==='query'?{transform:'rotate(180deg)'}:{}),'@media print':{WebkitPrintColorAdjust:'exact',colorAdjust:'exact'}
}));
const Dashes=styled('span',{name:'MuiLinearProgress',slot:'Dashed',overridesResolver:({ownerState:s},o)=>[o.dashed,o['dashedColor'+cap(s.color)]]})(({theme,ownerState:s})=>{
 const track=colors(theme,s.color).track;
 return {position:'absolute',marginTop:0,height:'100%',width:'100%',backgroundSize:'10px 10px',backgroundPosition:'0 -23px',...(s.color==='inherit'?{opacity:.3}:{}),backgroundImage:track?`radial-gradient(${track} 0%, ${track} 16%, transparent 42%)`:undefined,animation:'vpm-linear-dashes 3s infinite linear',
 '@keyframes vpm-linear-dashes':{'0%':{opacity:1,backgroundPosition:'0 -23px'},'60%':{opacity:0,backgroundPosition:'0 -23px'},'100%':{opacity:1,backgroundPosition:'-200px -23px'}},[reduce]:{animation:'none'}};
});
function barStyles(theme,s,second){
 const loading=s.variant==='indeterminate'||s.variant==='query',buffer=s.variant==='buffer',palette=colors(theme,s.color);
 const base={width:'100%',position:'absolute',left:0,bottom:0,top:0,transition:'transform 0.2s linear 0ms',transformOrigin:'left'};
 if(second){if(s.color==='inherit')base.opacity=.3;else base['--LinearProgressBar2-barColor']=palette.main;if(!buffer)base.backgroundColor='var(--LinearProgressBar2-barColor, currentColor)';else if(s.color!=='inherit')base.backgroundColor=palette.track;}
 else base.backgroundColor=palette.main;
 if(buffer||s.variant==='determinate'){if(!(second&&s.color==='inherit'))base.transition='transform .4s linear 0ms';if(buffer&&!second)base.zIndex=1;base[reduce]={transition:'none'};}
 if(loading){const key=second?'vpm-linear-tail':'vpm-linear-head';base.width='auto';base.animation=key+(second?' 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite':' 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite');
  base['@keyframes '+key]={'0%':{left:second?'-200%':'-35%',right:'100%'},'60%, 100%':{left:second?'107%':'100%',right:second?'-8%':'-90%'}};
  // Keep a visible static loading indicator when animation is disabled.
  base[reduce]={animation:'none',transition:'none',left:'25%',right:'25%',...(second?{opacity:0}:{})};
 }
 return base;
}
function barOverrides(second){return ({ownerState:s},o)=>[o.bar,o[second?'bar2':'bar1'],o['barColor'+cap(s.color)],o[(second?'bar2':'bar1')+cap(s.variant==='query'?'indeterminate':s.variant)]];}
const Bar1=styled('span',{name:'MuiLinearProgress',slot:'Bar1',overridesResolver:barOverrides(false)})(({theme,ownerState:s})=>barStyles(theme,s,false));
const Bar2=styled('span',{name:'MuiLinearProgress',slot:'Bar2',overridesResolver:barOverrides(true)})(({theme,ownerState:s})=>barStyles(theme,s,true));
const LinearProgress=React.forwardRef(function LinearProgress(input,ref){
 const p=useThemeProps({props:input,name:'MuiLinearProgress'}),theme=useTheme();
 const {color='primary',variant='indeterminate',min=0,max=100,value=min,valueBuffer=min,classes:custom=empty,className,...rest}=p;
 if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min||!Number.isFinite(value)||!Number.isFinite(valueBuffer))throw new RangeError('LinearProgress requires finite values and min < max');
 const state={...p,color,variant,min,max,value,valueBuffer},determinate=variant==='determinate',buffer=variant==='buffer';
 const clamp=v=>Math.max(min,Math.min(max,v));
 const offset=v=>({transform:'translateX('+(((clamp(v)-min)/(max-min)*100-100)*(theme.direction==='rtl'?-1:1))+'%)'});
 return h(Root,{role:'progressbar',...(determinate||buffer?{'aria-valuenow':clamp(value),'aria-valuemin':min,'aria-valuemax':max}:{}),...rest,ownerState:state,ref,className:join(classes(['root','color'+cap(color),variant],custom),className)},
 buffer&&h(Dashes,{ownerState:state,className:classes(['dashed'],custom)}),
 h(Bar1,{ownerState:state,className:classes(['bar','bar1'],custom),style:determinate||buffer?offset(value):undefined}),
 !determinate&&h(Bar2,{ownerState:state,className:classes(['bar','bar2',buffer&&'color'+cap(color)],custom),style:buffer?offset(valueBuffer):undefined}));
});
LinearProgress.displayName='LinearProgress';LinearProgress.muiName='LinearProgress';
module.exports={LinearProgress,linearProgressClasses,getLinearProgressUtilityClass:utility};
