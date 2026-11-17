'use strict';
const React=require('react');
const {Transition}=require('vreact-transition-group');
const {enter}=require('./overlay-owner.cjs');
const h=React.createElement,empty=Object.freeze({}),layout=typeof document==='undefined'?React.useEffect:React.useLayoutEffect;
function useRefs(...refs){return React.useMemo(()=>node=>{const cleanups=refs.map(ref=>typeof ref==='function'?ref(node):ref&&(ref.current=node));return()=>refs.forEach((ref,i)=>{if(typeof cleanups[i]==='function')cleanups[i]();else if(typeof ref==='function')ref(null);else if(ref)ref.current=null;});},refs);}
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
function useModalLayer(p,root,paper,exited,enabled=true){
 const {open,container,keepMounted=false,disablePortal=false,disableAutoFocus=false,disableScrollLock=false,closeAfterTransition=true}=p;
 const [host,setHost]=React.useState(null),previous=React.useRef(),owner=React.useRef(),focusEpoch=React.useRef(0),current=React.useRef();current.current=p;
 layout(()=>{
  if(!enabled||!open&&!keepMounted)return;
  const target=typeof container==='function'?container():container,doc=target?.ownerDocument||root.current?.ownerDocument||(typeof document!=='undefined'?document:null);
  if(!doc)return;if(open&&!previous.current&&!root.current?.contains(doc.activeElement))previous.current=doc.activeElement;
  setHost(target||doc.body);
 },[enabled,open,container,keepMounted,disablePortal]);
 const active=enabled&&(open||!exited&&closeAfterTransition);
 layout(()=>{
  if(!active||!root.current||!host)return;
  const entry=enter(root.current.ownerDocument,root.current,!disableScrollLock);owner.current=entry;
  return()=>{entry.release();if(owner.current===entry)owner.current=null;};
 },[active,host,disableScrollLock]);
 layout(()=>{
  if(!enabled||!open||!host||!paper.current)return;
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
 },[enabled,open,host,disableAutoFocus]);
 return {host,previous,owner};
}
module.exports={useRefs,Fade,useModalLayer};
