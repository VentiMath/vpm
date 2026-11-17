'use strict';
const React=require('react'),{createPortal}=require('react-dom'),{styled,useThemeProps}=require('./theme.cjs');
const empty=Object.freeze({}),recent=new WeakMap(),join=(...v)=>v.filter(Boolean).join(' '),utility=s=>'MuiTooltip-'+s,cap=s=>s[0].toUpperCase()+s.slice(1);
const names=['popper','popperInteractive','popperArrow','popperClose','tooltip','tooltipArrow','arrow','touch','tooltipPlacementLeft','tooltipPlacementRight','tooltipPlacementTop','tooltipPlacementBottom'];
const tooltipClasses=Object.freeze(Object.fromEntries(names.map(s=>[s,utility(s)])));
const resolve=(p,state)=>typeof p==='function'?p(state):p||empty;
const Popper=styled('div',{name:'MuiTooltip',slot:'Popper',overridesResolver:({ownerState:s},o)=>[o.popper,!s.disableInteractive&&o.popperInteractive,s.arrow&&o.popperArrow,!s.open&&o.popperClose]})(({theme,ownerState:s})=>({zIndex:theme.zIndex?.tooltip??1500,direction:theme.direction,pointerEvents:s.open&&!s.disableInteractive?'auto':'none'}));
const Bubble=styled('div',{name:'MuiTooltip',slot:'Tooltip',overridesResolver:({ownerState:s},o)=>[o.tooltip,s.arrow&&o.tooltipArrow,s.touch&&o.touch,o['tooltipPlacement'+cap(s.side)]]})(({theme,ownerState:s})=>({
 backgroundColor:theme.vars?.palette?.Tooltip?.bg||'rgba(97, 97, 97, 0.92)',color:(theme.vars?.palette||theme.palette).common?.white||'#fff',
 borderRadius:theme.shape.borderRadius,fontFamily:theme.typography.fontFamily,fontSize:theme.typography.pxToRem?.(s.touch?14:11)||((s.touch?14:11)/16)+'rem',fontWeight:theme.typography.fontWeightMedium,padding:s.touch?'8px 16px':'4px 8px',maxWidth:300,wordWrap:'break-word',lineHeight:s.touch?'1.1428571428571428em':undefined,
 position:s.arrow?'relative':'static',margin:0,transformOrigin:s.side==='top'?'center bottom':s.side==='bottom'?'center top':s.side==='left'?'right center':'left center',
 ...(s.open?{animation:'vpm-tooltip-enter 200ms cubic-bezier(0.4,0,0.2,1)'}:{opacity:0,transition:'opacity 150ms cubic-bezier(0.4,0,0.2,1)'}),
 '@keyframes vpm-tooltip-enter':{from:{opacity:0,transform:'scale(0.75, 0.5625)'},to:{opacity:1,transform:'scale(1)'}},'@media (prefers-reduced-motion: reduce)':{animation:'none',transition:'none'},
}));
const Arrow=styled('span',{name:'MuiTooltip',slot:'Arrow',overridesResolver:(_,o)=>o.arrow})(({theme})=>({position:'absolute',width:'1em',height:'.71em',overflow:'hidden',boxSizing:'border-box',color:theme.vars?.palette?.Tooltip?.bg||'rgba(97, 97, 97, 0.92)',backgroundColor:'currentColor'}));
function useMergedRefs(...refs){return React.useMemo(()=>node=>{const clean=refs.map(r=>typeof r==='function'?r(node):r&&(r.current=node));return()=>refs.forEach((r,i)=>{if(typeof clean[i]==='function')clean[i]();else if(typeof r==='function')r(null);else if(r)r.current=null;});},refs)}
const Tooltip=React.forwardRef(function Tooltip(input,forwardedRef){
 const props=useThemeProps({props:input,name:'MuiTooltip'});
 const {children,title,open:controlled,onOpen,onClose,arrow=false,describeChild=false,disableFocusListener=false,disableHoverListener=false,disableInteractive=false,disableTouchListener=false,enterDelay=100,enterNextDelay=0,enterTouchDelay=700,leaveDelay=0,leaveTouchDelay=1500,followCursor=false,id:givenId,placement='bottom',slots=empty,slotProps=empty,classes=empty,className,sx,...rest}=props;
 const generatedId=React.useId(),id=givenId||generatedId,child=React.Children.only(children);
 const [internal,setInternal]=React.useState(false),[anchor,setAnchor]=React.useState(null),[touch,setTouch]=React.useState(false),[present,setPresent]=React.useState(false),[position,setPosition]=React.useState(null);
 const open=Boolean((controlled===undefined?internal:controlled)&&(title||title===0)),interactive=!disableInteractive&&!followCursor;
 const state={...props,arrow,open,touch,placement,disableInteractive:!interactive,side:position?.placement?.split('-')[0]||placement.split('-')[0].replace('auto','bottom')};
 const popper=resolve(slotProps.popper,state),bubble=resolve(slotProps.tooltip,state),arrowProps=resolve(slotProps.arrow,state),transition=resolve(slotProps.transition,state);
 const timers=React.useRef({}),live=React.useRef({}),floating=React.useRef(null),arrowNode=React.useRef(null),cursor=React.useRef({x:0,y:0}),update=React.useRef(null),ignoreMouse=React.useRef(false),touchRestore=React.useRef(null);
 live.current={open,controlled,onOpen,onClose,leaveDelay,doc:anchor?.ownerDocument};
 const clear=name=>{clearTimeout(timers.current[name]);delete timers.current[name]};
 const schedule=(name,delay,fn)=>{clear(name);if(delay>0)timers.current[name]=setTimeout(fn,delay);else fn()};
 const restoreTouch=()=>{touchRestore.current?.();touchRestore.current=null};
 const close=event=>{clear('enter');clear('touch');const s=live.current;if(s.open){if(s.controlled===undefined)setInternal(false);s.onClose?.(event);if(s.doc)recent.set(s.doc,Date.now()+800+s.leaveDelay)}schedule('mouse',800,()=>{ignoreMouse.current=false;setTouch(false)})};
 const show=event=>{clear('leave');const s=live.current;if(!s.open){if(s.controlled===undefined)setInternal(true);s.onOpen?.(event)}if(s.doc)recent.set(s.doc,Infinity)};
 const enter=event=>{if(ignoreMouse.current&&event.type!=='touchstart')return;clear('leave');anchor?.removeAttribute('title');schedule('enter',(recent.get(anchor?.ownerDocument)||0)>Date.now()?enterNextDelay:enterDelay,()=>show(event))};
 const leave=event=>{clear('enter');schedule('leave',leaveDelay,()=>close(event))};
 React.useEffect(()=>()=>{for(const timer of Object.values(timers.current))clearTimeout(timer);restoreTouch();const s=live.current;if(s.doc&&s.open)recent.set(s.doc,Date.now()+800)},[]);
 React.useEffect(()=>{if(open){setPresent(true);clear('exit')}else if(present)schedule('exit',150,()=>{setPresent(false);setPosition(null)})},[open]);
 React.useEffect(()=>{if(!open||!anchor)return;const escape=e=>{if(e.key==='Escape')close(e)};anchor.ownerDocument.addEventListener('keydown',escape);return()=>anchor.ownerDocument.removeEventListener('keydown',escape)},[open,anchor]);
 const childRef=useMergedRefs(child.props.ref,forwardedRef,setAnchor),popperRef=useMergedRefs(floating,popper.ref),arrowRef=useMergedRefs(arrowNode,arrowProps.ref);
 const actualPlacement=popper.placement||placement;
 React.useEffect(()=>{
  if(!anchor||!floating.current||!present)return;
  const f=require('vfloating-ui-dom'),element=floating.current;let cancelled=false,sequence=0;
  const reference=followCursor?{contextElement:anchor,getBoundingClientRect(){const {x,y}=cursor.current;return {x,y,left:x,right:x,top:y,bottom:y,width:0,height:0}}}:anchor;
  const perform=()=>{const token=++sequence,middleware=[actualPlacement.startsWith('auto')?f.autoPlacement({alignment:actualPlacement.split('-')[1]}):f.flip({padding:8}),f.shift({padding:8}),...(arrow&&arrowNode.current?[f.arrow({element:arrowNode.current,padding:4})]:[])];
   f.computePosition(reference,element,{placement:actualPlacement.startsWith('auto')?'bottom':actualPlacement,strategy:'fixed',middleware}).then(result=>{if(!cancelled&&sequence===token)setPosition(old=>old&&old.x===result.x&&old.y===result.y&&old.placement===result.placement&&JSON.stringify(old.middlewareData.arrow)===JSON.stringify(result.middlewareData.arrow)?old:result)})};
  update.current=perform;const cleanup=f.autoUpdate(reference,element,perform);return()=>{cancelled=true;update.current=null;cleanup()};
 },[anchor,present,actualPlacement,followCursor,arrow,title,touch]);
 const string=typeof title==='string',accessible=describeChild?{title:!open&&!disableHoverListener&&string?title:undefined,'aria-describedby':open?id:undefined}:{'aria-label':string?title:undefined,'aria-labelledby':open&&!string?id:undefined};
 const childProps={...accessible,...rest,...child.props,ref:childRef,className:join(className,child.props.className)};
 const handler=(name,fn)=>{childProps[name]=event=>{child.props[name]?.(event);rest[name]?.(event);fn(event)}};
 if(!disableHoverListener){handler('onMouseOver',enter);handler('onMouseLeave',leave)}
 if(!disableFocusListener){handler('onFocus',event=>{if(event.target.matches?.(':focus-visible'))enter(event)});handler('onBlur',event=>{if(!event.currentTarget.contains(event.relatedTarget)&&!floating.current?.contains(event.relatedTarget))leave(event)})}
 if(followCursor)handler('onMouseMove',event=>{cursor.current={x:event.clientX,y:event.clientY};update.current?.()});
 if(!disableTouchListener){
  handler('onTouchStart',event=>{ignoreMouse.current=true;clear('mouse');clear('leave');clear('enter');restoreTouch();const node=event.currentTarget,old=node.style.webkitUserSelect;node.style.webkitUserSelect='none';touchRestore.current=()=>{node.style.webkitUserSelect=old};schedule('touch',enterTouchDelay,()=>{restoreTouch();setTouch(true);show(event)})});
  handler('onTouchEnd',event=>{clear('touch');restoreTouch();schedule('leave',leaveTouchDelay,()=>close(event));schedule('mouse',leaveTouchDelay+800,()=>{ignoreMouse.current=false;setTouch(false)})});
  handler('onTouchCancel',event=>{clear('touch');restoreTouch();close(event)});
 }
 let overlay=null;
 if(anchor&&(open||present||popper.keepMounted)){
  const side=state.side,gap=touch?24:14,edge={top:'bottom',bottom:'top',left:'right',right:'left'}[side];
  const PopperSlot=slots.popper||Popper,BubbleSlot=slots.tooltip||Bubble,ArrowSlot=slots.arrow||Arrow;
  const {placement:_placement,container,disablePortal,keepMounted,ref:_ref,...popperRest}=popper;
  const cx=(...keys)=>join(...keys.filter(Boolean).flatMap(k=>[utility(k),classes[k]]));
  const popupProps={...popperRest,ref:popperRef,id,role:'tooltip','data-popper-placement':position?.placement||actualPlacement,className:join(cx('popper',interactive&&'popperInteractive',arrow&&'popperArrow',!open&&'popperClose'),popper.className),sx,style:{position:'fixed',left:position?Math.round(position.x*(anchor.ownerDocument.defaultView.devicePixelRatio||1))/(anchor.ownerDocument.defaultView.devicePixelRatio||1):0,top:position?Math.round(position.y*(anchor.ownerDocument.defaultView.devicePixelRatio||1))/(anchor.ownerDocument.defaultView.devicePixelRatio||1):0,visibility:position&&present?'visible':'hidden',paddingTop:arrow?0:2,paddingBottom:arrow?0:2,paddingLeft:2,paddingRight:2,['padding'+cap(edge)]:gap,...popper.style}};
  if(typeof PopperSlot!=='string')popupProps.ownerState=state;
  if(interactive){popupProps.onMouseOver=e=>{popper.onMouseOver?.(e);enter(e)};popupProps.onMouseLeave=e=>{popper.onMouseLeave?.(e);leave(e)};popupProps.onFocus=e=>{popper.onFocus?.(e);clear('leave')};popupProps.onBlur=e=>{popper.onBlur?.(e);if(!e.currentTarget.contains(e.relatedTarget)&&!anchor.contains(e.relatedTarget))leave(e)}}
  const bp={...bubble,className:join(cx('tooltip',arrow&&'tooltipArrow',touch&&'touch','tooltipPlacement'+cap(side)),bubble.className)};if(typeof BubbleSlot!=='string')bp.ownerState=state;
  let arrowChild=null;
  if(arrow){const data=position?.middlewareData.arrow||{},horizontal=side==='left'||side==='right',ap={...arrowProps,ref:arrowRef,className:join(cx('arrow'),arrowProps.className),style:{position:'absolute',...(horizontal?{width:'.71em',height:'1em'}:{}),left:data.x,top:data.y,[edge]:'-.71em',clipPath:{top:'polygon(0 0,100% 0,50% 100%)',bottom:'polygon(0 100%,100% 100%,50% 0)',left:'polygon(0 0,100% 50%,0 100%)',right:'polygon(100% 0,0 50%,100% 100%)'}[side],...arrowProps.style}};if(typeof ArrowSlot!=='string')ap.ownerState=state;arrowChild=React.createElement(ArrowSlot,ap)}
  let contents=React.createElement(BubbleSlot,bp,title,arrowChild);if(slots.transition)contents=React.createElement(slots.transition,{in:open,appear:true,timeout:200,...transition},contents);
  overlay=React.createElement(PopperSlot,popupProps,contents);if(!disablePortal)overlay=createPortal(overlay,(typeof container==='function'?container():container)||anchor.ownerDocument.body);
 }
 return React.createElement(React.Fragment,null,React.cloneElement(child,childProps),overlay);
});
Tooltip.displayName='Tooltip';module.exports={Tooltip,tooltipClasses,getTooltipUtilityClass:utility};
