'use strict';
const React = require('react');
const { styled, useThemeProps } = require('./theme.cjs');
const { SvgIcon } = require('./text.cjs');
const h = React.createElement;
const empty = Object.freeze({});
const join = (...values) => values.filter(Boolean).join(' ');
const resolve = (props, state) => typeof props === 'function' ? props(state) : props || empty;
const utility = slot => 'MuiAvatar-' + slot;
const avatarClasses = Object.freeze(Object.fromEntries(['root','colorDefault','circular','rounded','square','img','fallback'].map(slot=>[slot,utility(slot)])));
const classes = (slots, custom) => join(...slots.filter(Boolean).map(slot=>join(utility(slot),Object.hasOwn(custom,slot)&&custom[slot])));
const effect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
function useRefs(...refs) {
 return React.useMemo(()=>node=>{
  const cleanups=refs.map(ref=>typeof ref==='function'?ref(node):ref&&(ref.current=node));
  return ()=>refs.forEach((ref,i)=>{if(typeof cleanups[i]==='function')cleanups[i]();else if(typeof ref==='function')ref(null);else if(ref)ref.current=null;});
 },refs);
}
const Root=styled('div',{name:'MuiAvatar',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o[s.variant],s.colorDefault&&o.colorDefault]})(({theme,ownerState:s})=>{
 const p=theme.vars?.palette||theme.palette;
 return {position:'relative',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,width:40,height:40,fontFamily:theme.typography.fontFamily,fontSize:theme.typography.pxToRem?.(20)||'1.25rem',lineHeight:1,borderRadius:s.variant==='rounded'?theme.shape?.borderRadius||4:s.variant==='square'?0:'50%',overflow:'hidden',userSelect:'none',...(s.colorDefault?{color:p.background.default,backgroundColor:p.Avatar?.defaultBg||(theme.palette.mode==='dark'?p.grey?.[600]||'#757575':p.grey?.[400]||'#bdbdbd'),'@media (forced-colors: active)':{boxSizing:'border-box',border:'1px solid ButtonBorder'}}:{})};
});
const Img=styled('img',{name:'MuiAvatar',slot:'Img',overridesResolver:(_,o)=>o.img})({width:'100%',height:'100%',textAlign:'center',objectFit:'cover',color:'transparent',textIndent:10000});
const Fallback=styled(SvgIcon,{name:'MuiAvatar',slot:'Fallback',overridesResolver:(_,o)=>o.fallback})({width:'75%',height:'75%'});
// Person glyph geometry is public Material design data, observed through its SVG output.
const personPath='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z';
const Avatar=React.forwardRef(function Avatar(input,forwardedRef){
 const p=useThemeProps({props:input,name:'MuiAvatar'});
 const {alt,src,srcSet,sizes,children,variant='circular',component='div',imgProps=empty,slots=empty,slotProps=empty,classes:custom=empty,className,...rest}=p;
 const initialState={...p,variant},imageProps=resolve(slotProps.img??imgProps,initialState);
 // Track the actual rendered request, including image-slot overrides. Do not
 // issue a second preload request that omits referrer/cross-origin policy.
 const source=React.useMemo(()=>({src:imageProps.src??src,srcSet:imageProps.srcSet??srcSet,sizes:imageProps.sizes??sizes,crossOrigin:imageProps.crossOrigin,referrerPolicy:imageProps.referrerPolicy}),[src,srcSet,sizes,imageProps.src,imageProps.srcSet,imageProps.sizes,imageProps.crossOrigin,imageProps.referrerPolicy]);
 const active=React.useRef(null);
 const [failed,setFailed]=React.useState(null),image=React.useRef(null);
 const hasSource=Boolean(source.src||source.srcSet),showImage=hasSource&&failed!==source;
 const state={...initialState,colorDefault:!showImage},rootProps=resolve(slotProps.root,state),fallbackProps=resolve(slotProps.fallback,state);
 const rootRef=useRefs(forwardedRef,rootProps.ref),imageRef=useRefs(image,imageProps.ref);
 effect(()=>{active.current=source;const node=image.current;if(showImage&&node?.complete&&node.naturalWidth===0&&active.current===source)setFailed(source);return()=>{if(active.current===source)active.current=null;};},[source,showImage]);
 const RootSlot=slots.root||Root,ImgSlot=slots.img||Img,FallbackSlot=slots.fallback||Fallback;
 const propsFor=(Slot,props)=>{if(typeof Slot==='string'){const {ownerState,...dom}=props;return dom;}return {...props,ownerState:state};};
 let content;
 if(showImage)content=h(ImgSlot,propsFor(ImgSlot,{alt,src,srcSet,sizes,...imageProps,ref:imageRef,className:join(classes(['img'],custom),imageProps.className),onLoad:e=>{if(active.current===source)imageProps.onLoad?.(e)},onError:e=>{if(active.current===source){setFailed(source);imageProps.onError?.(e)}}}));
 else if(children||children===0)content=children;
 else if(hasSource&&alt)content=alt[0];
 else content=h(FallbackSlot,propsFor(FallbackSlot,{...fallbackProps,className:join(classes(['fallback'],custom),fallbackProps.className)}),!slots.fallback?h('path',{d:personPath}):undefined);
 return h(RootSlot,propsFor(RootSlot,{...rest,...rootProps,...(!slots.root?{as:component}:{}),ref:rootRef,className:join(classes(['root',variant,!showImage&&'colorDefault'],custom),className,rootProps.className)}),content);
});
Avatar.displayName='Avatar';
Avatar.muiName='Avatar';
module.exports={Avatar,avatarClasses,getAvatarUtilityClass:utility};
