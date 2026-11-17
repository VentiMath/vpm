'use strict';
const React=require('react'),{createPortal}=require('react-dom');
const {Transition}=require('vreact-transition-group');
const {styled,useTheme,useThemeProps}=require('./theme.cjs');
const {Paper}=require('./surfaces.cjs'),{enter}=require('./overlay-owner.cjs');
const DialogContext=require('./dialog-context.cjs');
const h=React.createElement,empty=Object.freeze({}),layout=typeof document==='undefined'?React.useEffect:React.useLayoutEffect;
const join=(...values)=>values.filter(Boolean).join(' '),resolve=(value,state)=>(typeof value==='function'?value(state):value)||empty;
const upper=value=>String(value)[0].toUpperCase()+String(value).slice(1);
const utility=slot=>'MuiDialog-'+slot;
const dialogClasses=Object.freeze(Object.fromEntries(['root','backdrop','scrollPaper','scrollBody','container','paper','paperWidthFalse','paperWidthXs','paperWidthSm','paperWidthMd','paperWidthLg','paperWidthXl','paperFullWidth','paperFullScreen'].map(k=>[k,utility(k)])));
function useRefs(...refs){return React.useMemo(()=>node=>{const cleanups=refs.map(ref=>typeof ref==='function'?ref(node):ref&&(ref.current=node));return()=>refs.forEach((ref,i)=>{if(typeof cleanups[i]==='function')cleanups[i]();else if(typeof ref==='function')ref(null);else if(ref)ref.current=null;});},refs);}
const Root=styled('div',{name:'MuiDialog',slot:'Root',overridesResolver:(_,s)=>s.root})(({theme,ownerState:s})=>({position:'fixed',zIndex:theme.zIndex?.modal??1300,inset:0,...(s.exited&&!s.open?{visibility:'hidden'}:empty),'@media print':{position:'absolute !important'}}));
const Backdrop=styled('div',{name:'MuiDialog',slot:'Backdrop',overridesResolver:(_,s)=>s.backdrop})(({ownerState:s})=>({position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:s.invisible?'transparent':'rgba(0, 0, 0, 0.5)',WebkitTapHighlightColor:'transparent',zIndex:-1}));
const Container=styled('div',{name:'MuiDialog',slot:'Container',overridesResolver:({ownerState:s},o)=>[o.container,o['scroll'+upper(s.scroll)]]})(({ownerState:s})=>({height:'100%',outline:0,'@media print':{height:'auto'},...(s.scroll==='paper'?{display:'flex',alignItems:'center',justifyContent:'center'}:{overflowY:'auto',overflowX:'hidden',textAlign:'center','&::after':{content:'""',display:'inline-block',verticalAlign:'middle',height:'100%',width:0}})}));
const Sheet=styled(Paper,{name:'MuiDialog',slot:'Paper',overridesResolver:({ownerState:s},o)=>[o.paper,o['paperScroll'+upper(s.scroll)],o['paperWidth'+upper(s.maxWidth)],s.fullWidth&&o.paperFullWidth,s.fullScreen&&o.paperFullScreen]})(({theme,ownerState:s})=>{
 const bp=theme.breakpoints,unit=bp?.unit||'px',value=bp?.values?.[s.maxWidth]??({xs:0,sm:600,md:900,lg:1200,xl:1536}[s.maxWidth]);
 const max=s.maxWidth===false?'calc(100% - 64px)':s.maxWidth==='xs'?(unit==='px'?Math.max(value,444)+'px':`max(${value}${unit}, 444px)`):value+unit;
 return {margin:32,position:'relative',overflowY:'auto',outline:0,'@media print':{overflowY:'visible',boxShadow:'none'},...(s.scroll==='paper'?{display:'flex',flexDirection:'column',maxHeight:'calc(100% - 64px)'}:{display:'inline-block',verticalAlign:'middle',textAlign:'initial'}),maxWidth:max,
 ...(s.scroll==='body'&&s.maxWidth!==false?{[bp?.down?.((s.maxWidth==='xs'?Math.max(value,444):value)+64)||`@media (max-width:${value+63.95}px)`]:{maxWidth:'calc(100% - 64px)'}}:empty),
 ...(s.fullWidth?{width:'calc(100% - 64px)'}:empty),...(s.fullScreen?{margin:0,width:'100%',maxWidth:'100%',height:'100%',maxHeight:'none',borderRadius:0,...(s.scroll==='body'?{'&':{margin:0,maxWidth:'100%'}}:empty)}:empty)};
});
// Private fade primitive over the already-owned, cancellable transition engine.
// Custom transition slots use the public enter/exit contract instead.
const Fade=React.forwardRef(function Fade({children,in:open,timeout,appear=true,onEnter,onEntering,onEntered,onExit,onExiting,onExited,easing,addEndListener,style,...rest},ref){
 const node=React.useRef(),merged=useRefs(node,children.props.ref,ref);
 const duration=(phase,appearing)=>typeof timeout==='number'?timeout:(appearing?timeout?.appear??timeout?.enter:timeout?.[phase])??0;
 const prepare=(phase,appearing)=>{const el=node.current;el.style.transition=`opacity ${duration(phase,appearing)}ms ${typeof easing==='string'?easing:easing?.[phase]||'cubic-bezier(0.4, 0, 0.2, 1)'}`;};
 return h(Transition,{...rest,nodeRef:node,in:open,timeout,appear,onEnter:appearing=>{void node.current.scrollTop;prepare('enter',appearing);onEnter?.(node.current,appearing);},onEntering:appearing=>onEntering?.(node.current,appearing),onEntered:appearing=>onEntered?.(node.current,appearing),onExit:()=>{prepare('exit',false);onExit?.(node.current);},onExiting:()=>onExiting?.(node.current),onExited:()=>onExited?.(node.current),addEndListener:addEndListener?done=>addEndListener(node.current,done):undefined},state=>React.cloneElement(children,{ref:merged,style:{opacity:state==='entered'||state==='entering'?1:0,...(state==='exited'&&!open?{visibility:'hidden'}:empty),...style,...children.props.style}}));
});
function tabbables(root){
 const view=root.ownerDocument.defaultView;
 const items=[...root.querySelectorAll('a[href],button,input,select,textarea,[tabindex],[contenteditable="true"],summary')].filter(el=>el.tabIndex>=0&&!el.matches(':disabled')&&!el.closest('[inert],[hidden]')&&el.getAttribute('aria-disabled')!=='true'&&el.getClientRects().length&&view.getComputedStyle(el).visibility!=='hidden');
 return items.filter(el=>{if(el.tagName!=='INPUT'||el.type!=='radio'||!el.name)return true;const group=items.filter(x=>x.tagName==='INPUT'&&x.type==='radio'&&x.name===el.name&&x.form===el.form);return el===(group.find(x=>x.checked)||group[0]);}).map((el,i)=>({el,i})).sort((a,b)=>{const x=a.el.tabIndex,y=b.el.tabIndex;return x>0&&y>0?x-y||a.i-b.i:x>0?-1:y>0?1:a.i-b.i;}).map(x=>x.el);
}
const Dialog=React.forwardRef(function Dialog(input,forwarded){
 const p=useThemeProps({props:input,name:'MuiDialog'}),theme=useTheme();
 const {open,children,onClose,fullScreen=false,fullWidth=false,maxWidth='sm',scroll='paper',classes=empty,className,slots=empty,slotProps=empty,PaperProps,PaperComponent,BackdropProps,BackdropComponent,TransitionProps,TransitionComponent,transitionDuration=theme.transitions?{enter:theme.transitions.duration.enteringScreen,exit:theme.transitions.duration.leavingScreen}:{enter:225,exit:195},container,disablePortal=false,keepMounted=false,disableAutoFocus=false,disableEnforceFocus=false,disableRestoreFocus=false,disableEscapeKeyDown=false,disableScrollLock=false,hideBackdrop=false,closeAfterTransition=true,onTransitionEnter,onTransitionExited,'aria-labelledby':label,'aria-describedby':description,'aria-modal':modal=true,role='dialog',onKeyDown,onClick,...rest}=p;
 const id=React.useId(),titleId=label??id;
 const [host,setHost]=React.useState(null),[exited,setExited]=React.useState(!open);
 const root=React.useRef(),paper=React.useRef(),previous=React.useRef(),owner=React.useRef(),down=React.useRef(false),focusEpoch=React.useRef(0),current=React.useRef();current.current=p;
 const state={...p,open,fullScreen,fullWidth,maxWidth,scroll,exited};
 const rootProps=resolve(slotProps.root,state),paperProps=resolve(slotProps.paper??PaperProps,state),containerProps=resolve(slotProps.container,state),backdropProps=resolve(slotProps.backdrop??BackdropProps,state),transition=resolve(slotProps.transition??TransitionProps,state);
 const rootRef=useRefs(root,forwarded,rootProps.ref),paperRef=useRefs(paper,paperProps.ref);
 const parentValue=React.useMemo(()=>({titleId}),[titleId]);
 layout(()=>{
  if(!open&&!keepMounted)return;
  const target=typeof container==='function'?container():container,doc=target?.ownerDocument||root.current?.ownerDocument||(typeof document!=='undefined'?document:null);
  if(!doc)return;if(open&&!previous.current&&!root.current?.contains(doc.activeElement))previous.current=doc.activeElement;
  setHost(target||doc.body);
 },[open,container,keepMounted,disablePortal]);
 const active=open||!exited&&closeAfterTransition;
 layout(()=>{
  if(!active||!root.current||!host)return;
  const entry=enter(root.current.ownerDocument,root.current,!disableScrollLock);owner.current=entry;
  return()=>{entry.release();if(owner.current===entry)owner.current=null;};
 },[active,host,disableScrollLock]);
 layout(()=>{
  if(!open||!host||!paper.current)return;
  const epoch=++focusEpoch.current,node=paper.current,doc=node.ownerDocument;let last=node,listening=true;
  if(!previous.current&&!node.contains(doc.activeElement))previous.current=doc.activeElement;
  if(!disableAutoFocus&&!node.contains(doc.activeElement))node.focus();
  const focus=event=>{
   if(node.contains(event.target)){last=event.target;return;}
   // A nested portal's autoFocus precedes its layout effects. Check ownership
   // after that commit, so the parent does not steal the child's initial focus.
   queueMicrotask(()=>{if(listening&&current.current.open&&owner.current?.top()&&!current.current.disableEnforceFocus&&!node.contains(doc.activeElement))(last.isConnected&&node.contains(last)?last:node).focus();});
  };
  const key=event=>{
   if(!owner.current?.top()||event.defaultPrevented)return;
   if(event.key==='Escape'){if(!current.current.disableEscapeKeyDown){event.stopPropagation();current.current.onClose?.(event,'escapeKeyDown');}}
   else if(event.key==='Tab'&&!current.current.disableEnforceFocus){const items=tabbables(node),selected=doc.activeElement;if(!items.length){event.preventDefault();node.focus();}else if(event.shiftKey&&(selected===items[0]||selected===node)){event.preventDefault();items.at(-1).focus();}else if(!event.shiftKey&&(selected===items.at(-1)||selected===node)){event.preventDefault();items[0].focus();}}
  };
  doc.addEventListener('focusin',focus);doc.addEventListener('keydown',key);
  return()=>{listening=false;doc.removeEventListener('focusin',focus);doc.removeEventListener('keydown',key);const target=previous.current;
   // React restores selection after layout-effect cleanup. Restore afterwards,
   // and cancel this restoration if the dialog has already reopened.
   queueMicrotask(()=>{if(focusEpoch.current!==epoch)return;previous.current=null;if(!current.current.disableRestoreFocus&&target?.isConnected)target.focus();});
  };
 },[open,host,disableAutoFocus]);
 if(!disablePortal&&!host||!keepMounted&&!open&&exited)return null;
 const RootSlot=slots.root||Root,PaperSlot=slots.paper||Sheet,ContainerSlot=slots.container||Container,BackdropSlot=slots.backdrop||BackdropComponent||Backdrop,TransitionSlot=slots.transition||TransitionComponent||Fade;
 const reduced=theme.motion?.reducedMotion==='always'||theme.motion?.reducedMotion==='system'&&host?.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const duration=reduced&&!transition.disablePrefersReducedMotion?0:transitionDuration;
 const close=event=>{if(event.target===event.currentTarget&&down.current&&!event.defaultPrevented&&owner.current?.top()&&current.current.open)onClose?.(event,'backdropClick');down.current=false;};
 const shell=h(ContainerSlot,{role:'presentation',tabIndex:-1,...containerProps,ownerState:typeof ContainerSlot==='string'?undefined:state,className:join(utility('container'),utility('scroll'+upper(scroll)),classes.container,classes['scroll'+upper(scroll)],containerProps.className),onMouseDown:event=>{down.current=event.target===event.currentTarget;containerProps.onMouseDown?.(event);},onClick:event=>{containerProps.onClick?.(event);close(event);}},
  h(PaperSlot,{elevation:24,component:PaperComponent,role,'aria-describedby':description,'aria-labelledby':titleId,'aria-modal':modal,tabIndex:-1,'data-mui-focusable':'',...paperProps,ref:paperRef,ownerState:typeof PaperSlot==='string'?undefined:state,className:join(utility('paper'),utility('paperWidth'+upper(maxWidth)),fullScreen&&utility('paperFullScreen'),fullWidth&&utility('paperFullWidth'),classes.paper,classes['paperWidth'+upper(maxWidth)],classes['paperScroll'+upper(scroll)],fullScreen&&classes.paperFullScreen,fullWidth&&classes.paperFullWidth,paperProps.className)},h(DialogContext.Provider,{value:parentValue},children)));
 const body=h(RootSlot,{role:'presentation',...rest,...rootProps,ref:rootRef,ownerState:typeof RootSlot==='string'?undefined:state,className:join(utility('root'),'MuiModal-root',!open&&exited&&'MuiModal-hidden',classes.root,className,rootProps.className),onKeyDown:event=>{onKeyDown?.(event);rootProps.onKeyDown?.(event);},onClick:event=>{onClick?.(event);rootProps.onClick?.(event);},onFocusCapture:event=>{if(!previous.current&&event.relatedTarget&&!root.current?.contains(event.relatedTarget))previous.current=event.relatedTarget;rest.onFocusCapture?.(event);rootProps.onFocusCapture?.(event);}},
  !hideBackdrop?h(Fade,{in:open,timeout:duration},h(BackdropSlot,{...Object.fromEntries(Object.entries(backdropProps).filter(([k])=>!['invisible','transitionDuration'].includes(k))),'aria-hidden':true,ownerState:typeof BackdropSlot==='string'?undefined:{...state,invisible:backdropProps.invisible},className:join('MuiBackdrop-root','MuiModal-backdrop',utility('backdrop'),backdropProps.invisible&&'MuiBackdrop-invisible',classes.backdrop,backdropProps.className),onMouseDown:event=>{down.current=event.target===event.currentTarget;backdropProps.onMouseDown?.(event);},onClick:event=>{backdropProps.onClick?.(event);close(event);}})):null,
  h(TransitionSlot,{appear:true,in:open,timeout:duration,...transition,onEnter:(node,appearing)=>{setExited(false);onTransitionEnter?.();transition.onEnter?.(node,appearing);},onExited:node=>{if(!current.current.open)setExited(true);onTransitionExited?.();transition.onExited?.(node);}},shell));
 return disablePortal?body:createPortal(body,host);
});
Dialog.displayName='Dialog';
module.exports={Dialog,dialogClasses,getDialogUtilityClass:utility};
