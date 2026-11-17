'use strict';
const React=require('react'),{createPortal}=require('react-dom');
const {styled,useTheme,useThemeProps}=require('./theme.cjs');
const {Paper}=require('./surfaces.cjs'),{Slide}=require('./slides.cjs');
const {useRefs,Fade,useModalLayer}=require('./modal-primitives.cjs');
const h=React.createElement,empty=Object.freeze({});
const join=(...parts)=>parts.filter(Boolean).join(' '),upper=s=>s[0].toUpperCase()+s.slice(1),resolve=(props,state)=>(typeof props==='function'?props(state):props)||empty;
const utility=slot=>'MuiDrawer-'+slot;
const drawerClasses=Object.freeze(Object.fromEntries(['root','docked','paper','anchorLeft','anchorRight','anchorTop','anchorBottom','modal'].map(s=>[s,utility(s)])));
const Docked=styled('div',{name:'MuiDrawer',slot:'Docked',overridesResolver:({ownerState:s},o)=>[o.root,o.docked,o['anchor'+upper(s.anchor)]]})({flex:'0 0 auto'});
const Root=styled('div',{name:'MuiDrawer',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o.modal,o['anchor'+upper(s.anchor)]]})(({theme,ownerState:s})=>({position:'fixed',inset:0,zIndex:theme.zIndex?.drawer??1200,...(!s.open&&s.exited?{visibility:'hidden'}:empty)}));
const Sheet=styled(Paper,{name:'MuiDrawer',slot:'Paper',overridesResolver:({ownerState:s},o)=>[o.paper,o['paperAnchor'+upper(s.anchor)],s.variant!=='temporary'&&o['paperAnchorDocked'+upper(s.anchor)]]})(({theme,ownerState:s})=>{
 const vertical=s.anchor==='left'||s.anchor==='right',palette=theme.vars?.palette||theme.palette;
 return {overflowY:'auto',display:'flex',flexDirection:'column',height:'100%',flex:'1 0 auto',zIndex:theme.zIndex?.drawer??1200,WebkitOverflowScrolling:'touch',position:'fixed',top:0,outline:0,
 [s.anchor]:0,...(!vertical?{left:0,right:0,height:'auto',maxHeight:'100%',...(s.anchor==='bottom'?{top:'auto'}:empty)}:empty),
 ...(s.variant!=='temporary'?{['border'+({left:'Right',right:'Left',top:'Bottom',bottom:'Top'}[s.anchor])]:'1px solid '+palette.divider}:empty)};
});
const Backdrop=styled('div',{name:'MuiBackdrop',slot:'Root',overridesResolver:(_,s)=>s.root})(({ownerState:s})=>({position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:s.invisible?'transparent':'rgba(0, 0, 0, 0.5)',WebkitTapHighlightColor:'transparent',zIndex:-1}));
const opposite={left:'right',right:'left',top:'down',bottom:'up'};
const Drawer=React.forwardRef(function Drawer(input,forwarded){
 const p=useThemeProps({props:input,name:'MuiDrawer'}),theme=useTheme();
 const {anchor='left',variant='temporary',open=false,elevation=16,children,onClose,classes=empty,className,slots=empty,slotProps=empty,ModalProps=empty,PaperProps,SlideProps,transitionDuration={enter:theme.transitions?.duration?.enteringScreen??225,exit:theme.transitions?.duration?.leavingScreen??195},...rest}=p;
 const temporary=variant==='temporary',physical=theme.direction==='rtl'&&['left','right'].includes(anchor)?opposite[anchor]:anchor;
 const [exited,setExited]=React.useState(!open),mounted=React.useRef(false),current=React.useRef();
 React.useEffect(()=>{mounted.current=true;},[]);
 const state={...p,anchor,variant,open,elevation,exited};
 const rootProps=resolve(slotProps[temporary?'root':'docked'],state),paperProps=resolve(slotProps.paper??PaperProps,state),transition=resolve(slotProps.transition??SlideProps,state);
 const modal={...rest,...ModalProps,...rootProps,open:rootProps.open??ModalProps.open??open,onClose:rootProps.onClose??ModalProps.onClose??onClose};current.current=modal;
 const {container,disablePortal=false,keepMounted=false,disableAutoFocus,disableEnforceFocus,disableRestoreFocus,disableEscapeKeyDown,disableScrollLock,hideBackdrop=false,closeAfterTransition=false,onTransitionEnter,onTransitionExited,onClose:closeHandler,open:modalOpen,BackdropProps,BackdropComponent,slots:modalSlots,slotProps:modalSlotProps,classes:modalClasses,ref:modalRef,...dom}=modal;
 const root=React.useRef(),paper=React.useRef(),down=React.useRef(false);
 const {host,previous,owner}=useModalLayer({...modal,closeAfterTransition},root,paper,exited,temporary);
 const rootRef=useRefs(root,forwarded,rootProps.ref,temporary?ModalProps.ref:null),paperRef=useRefs(paper,paperProps.ref);
 const backdropProps=resolve(slotProps.backdrop??modalSlotProps?.backdrop??BackdropProps,state);
 const RootSlot=temporary?(slots.root||Root):(slots.docked||Docked),PaperSlot=slots.paper||Sheet,TransitionSlot=slots.transition||Slide,BackdropSlot=slots.backdrop||modalSlots?.backdrop||BackdropComponent||Backdrop;
 const effectiveOpen=temporary?modalOpen:open;
 const reduced=theme.motion?.reducedMotion==='always'||theme.motion?.reducedMotion==='system'&&host?.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const duration=reduced&&!transition.disablePrefersReducedMotion?0:transitionDuration;
 const paperNode=h(PaperSlot,{elevation:temporary?elevation:0,square:true,...(temporary?{role:'dialog','aria-modal':true,'data-mui-focusable':'',tabIndex:-1}:empty),...paperProps,ref:paperRef,...(typeof PaperSlot==='string'?empty:{ownerState:state}),className:join(utility('paper'),classes.paper,classes['paperAnchor'+upper(anchor)],variant!=='temporary'&&classes['paperAnchorDocked'+upper(anchor)],paperProps.className)},children);
 const content=variant==='permanent'?paperNode:h(TransitionSlot,{in:effectiveOpen,direction:opposite[physical],timeout:duration,appear:mounted.current,...transition,onEnter:(node,appearing)=>{setExited(false);onTransitionEnter?.();transition.onEnter?.(node,appearing);},onExited:node=>{if(!current.current.open)setExited(true);onTransitionExited?.();transition.onExited?.(node);}},paperNode);
 if(!temporary)return h(RootSlot,{...rest,...rootProps,ref:rootRef,...(typeof RootSlot==='string'?empty:{ownerState:state}),className:join(utility('root'),utility('anchor'+upper(anchor)),utility('docked'),classes.root,classes.docked,className,rootProps.className)},content);
 if(!disablePortal&&!host||!keepMounted&&!effectiveOpen&&exited)return null;
 const close=event=>{if(event.target===event.currentTarget&&down.current&&!event.defaultPrevented&&owner.current?.top()&&current.current.open)closeHandler?.(event,'backdropClick');down.current=false;};
 const body=h(RootSlot,{role:'presentation',...dom,ref:rootRef,...(typeof RootSlot==='string'?empty:{ownerState:{...state,open:effectiveOpen}}),className:join(utility('root'),utility('anchor'+upper(anchor)),utility('modal'),'MuiModal-root',!effectiveOpen&&exited&&'MuiModal-hidden',classes.root,classes.modal,modalClasses?.root,className,rootProps.className),onFocusCapture:event=>{if(!previous.current&&event.relatedTarget&&!root.current?.contains(event.relatedTarget))previous.current=event.relatedTarget;dom.onFocusCapture?.(event);}},
 !hideBackdrop?h(Fade,{in:effectiveOpen,timeout:reduced&&!transition.disablePrefersReducedMotion?0:backdropProps.transitionDuration??duration},h(BackdropSlot,{'aria-hidden':true,...Object.fromEntries(Object.entries(backdropProps).filter(([k])=>!['invisible','transitionDuration','classes'].includes(k))),...(typeof BackdropSlot==='string'?empty:{ownerState:{invisible:backdropProps.invisible}}),className:join('MuiBackdrop-root','MuiModal-backdrop',backdropProps.invisible&&'MuiBackdrop-invisible',backdropProps.classes?.root,backdropProps.className),onMouseDown:event=>{down.current=event.target===event.currentTarget;backdropProps.onMouseDown?.(event);},onClick:event=>{backdropProps.onClick?.(event);close(event);}})):null,content);
 return disablePortal?body:createPortal(body,host);
});
Drawer.displayName='Drawer';module.exports={Drawer,drawerClasses,getDrawerUtilityClass:utility};
