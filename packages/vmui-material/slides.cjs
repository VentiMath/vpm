'use strict';
const React=require('react');
const {Transition}=require('vreact-transition-group');
const {useTheme,useThemeProps}=require('./theme.cjs');
const layout=typeof document==='undefined'?React.useEffect:React.useLayoutEffect;
function useRefs(...refs){return React.useMemo(()=>node=>{const cleanups=refs.map(ref=>typeof ref==='function'?ref(node):ref&&(ref.current=node));return()=>refs.forEach((ref,i)=>{if(typeof cleanups[i]==='function')cleanups[i]();else if(typeof ref==='function')ref(null);else if(ref)ref.current=null;});},refs);}
// Work in the node's viewport, undoing only its current translation. This also
// handles a reversal partway through a transition without moving the child to
// another parent or recreating it.
function outside(node,direction,container){
 const view=node.ownerDocument.defaultView,rect=node.getBoundingClientRect(),computed=view.getComputedStyle(node).transform;
 const matrix=computed&&computed!=='none'?new view.DOMMatrixReadOnly(computed):null,x=matrix?.m41||0,y=matrix?.m42||0;
 const target=typeof container==='function'?container(node):container,edge=target?.getBoundingClientRect()||{left:0,top:0,right:view.innerWidth,bottom:view.innerHeight};
 const horizontal=direction==='left'||direction==='right';
 const distance=direction==='left'?edge.right-rect.left+x:direction==='right'?edge.left-rect.right+x:direction==='up'?edge.bottom-rect.top+y:edge.top-rect.bottom+y;
 return `translate${horizontal?'X':'Y'}(${distance}px)`;
}
function translate(node,value){node.style.transform=value;node.style.webkitTransform=value;}
const Slide=React.forwardRef(function Slide(input,forwarded){
 const p=useThemeProps({props:input,name:'MuiSlide'}),theme=useTheme();
 const {children,in:open=false,direction='down',container,appear=true,enter=true,exit=true,mountOnEnter=false,unmountOnExit=false,
  timeout={enter:theme.transitions?.duration?.enteringScreen??225,exit:theme.transitions?.duration?.leavingScreen??195},
  easing={enter:theme.transitions?.easing?.easeOut||'cubic-bezier(0.0, 0, 0.2, 1)',exit:theme.transitions?.easing?.sharp||'cubic-bezier(0.4, 0, 0.6, 1)'},
  disablePrefersReducedMotion=false,onEnter,onEntering,onEntered,onExit,onExiting,onExited,addEndListener,style,...rest}=p;
 const node=React.useRef(null),ref=useRefs(node,forwarded,children.props.ref);
 const view=node.current?.ownerDocument.defaultView||(typeof window==='undefined'?null:window);
 const reduced=!disablePrefersReducedMotion&&(theme.motion?.reducedMotion==='always'||theme.motion?.reducedMotion==='system'&&view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const effectiveTimeout=reduced?0:timeout;
 const position=()=>{if(node.current)translate(node.current,outside(node.current,direction,container));};
 layout(()=>{if(!open)position();},[open,direction,container]);
 React.useEffect(()=>{
  if(open||!node.current)return;
  const el=node.current,win=el.ownerDocument.defaultView;let frame;
  const update=()=>{if(frame==null)frame=win.requestAnimationFrame(()=>{frame=null;position();});};
  win.addEventListener('resize',update);
  const observer=win.ResizeObserver?new win.ResizeObserver(update):null,target=typeof container==='function'?container(el):container;
  observer?.observe(el);if(target&&target!==el)observer?.observe(target);
  return()=>{win.removeEventListener('resize',update);observer?.disconnect();if(frame!=null)win.cancelAnimationFrame(frame);};
 },[open,direction,container]);
 function timing(phase,appearing){
  const ms=typeof effectiveTimeout==='number'?effectiveTimeout:(appearing?effectiveTimeout?.appear??effectiveTimeout?.enter:effectiveTimeout?.[phase])??0;
  const duration=reduced?'0ms':style?.transitionDuration??ms+'ms',curve=style?.transitionTimingFunction??(typeof easing==='string'?easing:easing?.[phase]),delay=style?.transitionDelay??'0ms';
  node.current.style.transition=`transform ${duration} ${curve||'ease'} ${delay}`;
  node.current.style.webkitTransition=`-webkit-transform ${duration} ${curve||'ease'} ${delay}`;
 }
 return React.createElement(Transition,{nodeRef:node,in:open,appear,enter,exit,mountOnEnter,unmountOnExit,timeout:effectiveTimeout,
  onEnter:appearing=>{position();void node.current.offsetHeight;onEnter?.(node.current,appearing);},
  onEntering:appearing=>{timing('enter',appearing);translate(node.current,'none');onEntering?.(node.current,appearing);},
  onEntered:appearing=>onEntered?.(node.current,appearing),
  onExit:()=>{timing('exit',false);position();onExit?.(node.current);},onExiting:()=>onExiting?.(node.current),
  onExited:()=>{node.current.style.transition='';node.current.style.webkitTransition='';onExited?.(node.current);},
  addEndListener:addEndListener?done=>addEndListener(node.current,done):undefined,
 },state=>React.cloneElement(children,{...rest,ref,style:{...(state==='exited'&&!open?{visibility:'hidden'}:{}),...style,...children.props.style}}));
});
Slide.displayName='Slide';
module.exports={Slide};
