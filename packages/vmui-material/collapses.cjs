"use strict";
const React = require('react');
const {Transition} = require('vreact-transition-group');
const {styled,useTheme,useThemeProps} = require('./theme.cjs');
const empty = Object.freeze({});
const join = (...xs)=>xs.filter(Boolean).join(' ');
const utility = key=>'MuiCollapse-'+key;
const collapseClasses=Object.freeze(Object.fromEntries(['root','horizontal','vertical','entered','hidden','wrapper','wrapperInner'].map(k=>[k,utility(k)])));
const Root=styled('div',{name:'MuiCollapse',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o[s.orientation],s.state==='entered'&&o.entered,s.hidden&&o.hidden]})(({theme,ownerState:s})=>({
 height:0,overflow:'hidden',transition:theme.transitions?.create?.(s.orientation==='horizontal'?'width':'height')||`${s.orientation==='horizontal'?'width':'height'} 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms`,
 ...(s.orientation==='horizontal'?{height:'auto',width:0}:empty),
 ...(s.state==='entered'?{[s.orientation==='horizontal'?'width':'height']:'auto',overflow:'visible'}:empty),
 ...(s.hidden?{visibility:'hidden'}:empty),
}));
const Wrapper=styled('div',{name:'MuiCollapse',slot:'Wrapper',overridesResolver:(_,o)=>o.wrapper})(({ownerState:s})=>({display:'flex',width:s.orientation==='horizontal'?'auto':'100%',...(s.orientation==='horizontal'?{height:'100%'}:empty)}));
const Inner=styled('div',{name:'MuiCollapse',slot:'WrapperInner',overridesResolver:(_,o)=>o.wrapperInner})(({ownerState:s})=>({width:s.orientation==='horizontal'?'auto':'100%',...(s.orientation==='horizontal'?{height:'100%'}:empty)}));
function resolve(value,state){return (typeof value==='function'?value(state):value)||empty;}
function setRef(ref,node){if(typeof ref==='function'){const cleanup=ref(node);return typeof cleanup==='function'?cleanup:()=>ref(null);}if(ref){ref.current=node;return()=>{ref.current=null;};}}
function useRefs(...refs){return React.useMemo(()=>node=>{const cleanups=refs.map(ref=>setRef(ref,node));return()=>{for(const clean of cleanups)clean?.();};},refs);}
const Collapse=React.forwardRef(function Collapse(input,forwardedRef){
 const props=useThemeProps({props:input,name:'MuiCollapse'}),theme=useTheme();
 const {children,in:open=false,collapsedSize=0,orientation='vertical',component='div',classes=empty,className,style,slots=empty,slotProps=empty,
  timeout=theme.transitions?.duration?.standard??300,easing,appear=false,enter=true,exit=true,mountOnEnter=false,unmountOnExit=false,
  disablePrefersReducedMotion=false,onEnter,onEntering,onEntered,onExit,onExiting,onExited,addEndListener,...rest}=props;
 const node=React.useRef(null),wrapper=React.useRef(null),autoTimer=React.useRef(null),duration=React.useRef(0);
 const horizontal=orientation==='horizontal',dimension=horizontal?'width':'height',minimum=typeof collapsedSize==='number'?collapsedSize+'px':collapsedSize;
 const clear=()=>{clearTimeout(autoTimer.current);autoTimer.current=null;};
 React.useEffect(()=>clear,[]);
 const reduced=()=>!disablePrefersReducedMotion&&(theme.motion?.reducedMotion==='always'||theme.motion?.reducedMotion==='system'&&node.current?.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const size=()=>wrapper.current?.[horizontal?'clientWidth':'clientHeight']||0;
 function timing(mode,appearing,height){
  let ms=typeof timeout==='number'?timeout:timeout==='auto'?(theme.transitions?.getAutoHeightDuration?.(height)??(height?Math.round(160+10*Math.sqrt(height)+height/10):0)):(appearing?timeout.appear??timeout.enter:timeout[mode])??0;
  // A resolved Material theme owns automatic timing. Standalone fallback keeps
  // height-sensitive motion without importing a second theme implementation.
  if(reduced())ms=0;
  const cssDuration=style?.transitionDuration;
  node.current.style.transitionDuration=cssDuration??ms+'ms';
  const curve=typeof easing==='string'?easing:easing?.[mode];
  if(curve!==undefined)node.current.style.transitionTimingFunction=curve;
  duration.current=ms;
 }
 const callbacks={
  onEnter(appearing){clear();if(horizontal)wrapper.current.style.position='absolute';node.current.style[dimension]=minimum;onEnter?.(node.current,appearing);},
  onEntering(appearing){const measured=size();if(horizontal)wrapper.current.style.position='';timing('enter',appearing,measured);node.current.style[dimension]=measured+'px';onEntering?.(node.current,appearing);},
  onEntered(appearing){clear();if(wrapper.current)wrapper.current.style.position='';node.current.style[dimension]='auto';onEntered?.(node.current,appearing);},
  onExit(){clear();node.current.style[dimension]=size()+'px';onExit?.(node.current);},
  onExiting(){const measured=size();void node.current.offsetHeight;timing('exit',false,measured);node.current.style[dimension]=minimum;onExiting?.(node.current);},
  onExited(){clear();node.current.style[dimension]=minimum;onExited?.(node.current);},
  addEndListener(done){if(timeout==='auto'||reduced())autoTimer.current=setTimeout(done,duration.current);addEndListener?.(node.current,done);},
 };
 // Slot callbacks depend on transition state, so their refs are merged by the
 // render helper below rather than recreating the Transition itself.
 const renderState=state=>React.createElement(CollapseState,{...rest,slots,slotProps,component,classes,className,style,children,node,wrapper,forwardedRef,
  ownerState:{...props,orientation,collapsedSize,timeout,state,in:open,hidden:state==='exited'&&!open&&minimum==='0px'},minimum,dimension});
 return React.createElement(Transition,{in:open,nodeRef:node,timeout:timeout==='auto'?null:timeout,appear,enter,exit,mountOnEnter,unmountOnExit,...callbacks},renderState);
});
function CollapseState({slots,slotProps,component,classes,className,style,children,node,wrapper,forwardedRef,ownerState:s,minimum,dimension,...rest}){
 const rootProps=resolve(slotProps.root,s),wrapProps=resolve(slotProps.wrapper,s),innerProps=resolve(slotProps.wrapperInner,s);
 const rootRef=useRefs(node,forwardedRef,rootProps.ref),wrapRef=useRefs(wrapper,wrapProps.ref);
 function attributes(defaultSlot,slot,extra,base){
  const Type=slot||defaultSlot,props={...base,...extra,ownerState:s,className:join(base.className,extra.className)};
  if(slot&&typeof slot==='string')delete props.ownerState;
  return [Type,props];
 }
 const [RootType,root]=attributes(Root,slots.root,rootProps,{...rest,as:slots.root?undefined:component,ownerState:s,className:join(utility('root'),utility(s.orientation),s.state==='entered'&&utility('entered'),s.hidden&&utility('hidden'),classes.root,classes[s.orientation],s.state==='entered'&&classes.entered,s.hidden&&classes.hidden,className)});
 const [WrapType,wrap]=attributes(Wrapper,slots.wrapper,wrapProps,{className:join(utility('wrapper'),utility(s.orientation),classes[s.orientation],classes.wrapper)});
 const [InnerType,inner]=attributes(Inner,slots.wrapperInner,innerProps,{className:join(utility('wrapperInner'),utility(s.orientation),classes[s.orientation],classes.wrapperInner)});
 root.ref=rootRef;root.style={[dimension==='width'?'minWidth':'minHeight']:minimum,...style,...rootProps.style};wrap.ref=wrapRef;
 return React.createElement(RootType,root,React.createElement(WrapType,wrap,React.createElement(InnerType,inner,children)));
}
Collapse.displayName='Collapse';
module.exports={Collapse,collapseClasses,getCollapseUtilityClass:utility};
