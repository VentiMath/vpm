'use strict';
const React=require('react');
const {styled,useThemeProps}=require('./theme.cjs');
const h=React.createElement,empty=Object.freeze({});
const utility=slot=>'MuiCircularProgress-'+slot;
const circularProgressClasses=Object.freeze(Object.fromEntries(['root','determinate','indeterminate','colorPrimary','colorSecondary','svg','track','circle','circleDisableShrink'].map(s=>[s,utility(s)])));
const join=(...s)=>s.filter(Boolean).join(' ');
const classes=(slots,custom)=>slots.filter(Boolean).map(s=>join(utility(s),Object.hasOwn(custom,s)&&custom[s])).join(' ');
const capitalize=s=>s[0].toUpperCase()+s.slice(1);
const Root=styled('span',{name:'MuiCircularProgress',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o[s.variant],o['color'+capitalize(s.color)]]})(({theme,ownerState:s})=>({
 display:'inline-block',color:s.color==='inherit'?undefined:(theme.vars?.palette||theme.palette)[s.color]?.main,
 ...(s.variant==='determinate'?{transition:theme.transitions?.create?.('transform')||'transform 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms'}:{animation:'vpm-progress-spin 1.4s linear infinite','@keyframes vpm-progress-spin':{from:{transform:'rotate(0deg)'},to:{transform:'rotate(360deg)'}},'@media (prefers-reduced-motion: reduce)':{animation:'none'}}),
}));
const Svg=styled('svg',{name:'MuiCircularProgress',slot:'Svg',overridesResolver:(_,o)=>o.svg})({display:'block'});
const Circle=styled('circle',{name:'MuiCircularProgress',slot:'Circle',overridesResolver:({ownerState:s},o)=>[o.circle,o['circle'+capitalize(s.variant)],s.disableShrink&&o.circleDisableShrink]})(({theme,ownerState:s})=>({
 stroke:'currentColor',...(s.variant==='determinate'?{transition:theme.transitions?.create?.('stroke-dashoffset')||'stroke-dashoffset 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms'}:{strokeDasharray:'80px, 200px',strokeDashoffset:0,...(!s.disableShrink?{animation:'vpm-progress-dash 1.4s ease-in-out infinite','@keyframes vpm-progress-dash':{'0%':{strokeDasharray:'1px, 200px',strokeDashoffset:0},'50%':{strokeDasharray:'100px, 200px',strokeDashoffset:-15},'100%':{strokeDasharray:'1px, 200px',strokeDashoffset:-126}},'@media (prefers-reduced-motion: reduce)':{animation:'none'}}:{})})
}));
const Track=styled('circle',{name:'MuiCircularProgress',slot:'Track',overridesResolver:(_,o)=>o.track})({stroke:'currentColor',opacity:0.12});
const CircularProgress=React.forwardRef(function CircularProgress(input,ref){
 const p=useThemeProps({props:input,name:'MuiCircularProgress'});
 const {color='primary',disableShrink=false,enableTrackSlot=false,size=40,thickness=3.6,variant='indeterminate',min=0,max=100,value=min,classes:custom=empty,className,style,...rest}=p;
 if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min||!Number.isFinite(value))throw new RangeError('CircularProgress requires a finite value and min < max');
 if(!Number.isFinite(thickness)||thickness<=0||thickness>44)throw new RangeError('CircularProgress thickness must be greater than zero and at most 44');
 const state={...p,color,disableShrink,enableTrackSlot,size,thickness,variant,min,max,value};
 const determinate=variant==='determinate',radius=(44-thickness)/2,geometry={cx:44,cy:44,r:radius,fill:'none',strokeWidth:thickness};
 const clamped=Math.max(min,Math.min(max,value)),circumference=2*Math.PI*radius;
 return h(Root,{role:'progressbar',...(determinate?{'aria-valuenow':Math.round(clamped),'aria-valuemin':min,'aria-valuemax':max}:{}),...rest,ownerState:state,ref,className:join(classes(['root',variant,'color'+capitalize(color)],custom),className),style:{width:size,height:size,...(determinate?{transform:'rotate(-90deg)'}:{}),...style}},
 h(Svg,{ownerState:state,className:classes(['svg'],custom),viewBox:'22 22 44 44'},
 enableTrackSlot&&h(Track,{ownerState:state,className:classes(['track'],custom),...geometry,'aria-hidden':true}),
 h(Circle,{ownerState:state,className:classes(['circle',disableShrink&&'circleDisableShrink'],custom),style:determinate?{strokeDasharray:circumference.toFixed(3),strokeDashoffset:((1-(clamped-min)/(max-min))*circumference).toFixed(3)+'px'}:undefined,...geometry})));
});
CircularProgress.displayName='CircularProgress';CircularProgress.muiName='CircularProgress';
module.exports={CircularProgress,circularProgressClasses,getCircularProgressUtilityClass:utility};
