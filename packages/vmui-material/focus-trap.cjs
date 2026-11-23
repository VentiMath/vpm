"use strict";
const React=require("react"),{useRefs,tabbables}=require("./modal-primitives.cjs");
const h=React.createElement,always=()=>true,owners=new WeakMap();
// Focus containment alone must not hide siblings or lock body scrolling.
function enter(doc,root){let stack=owners.get(doc);if(!stack)owners.set(doc,stack=[]);const token={root};stack.push(token);return{top:()=>stack.at(-1)===token,release(){const i=stack.indexOf(token);if(i>=0)stack.splice(i,1);if(!stack.length)owners.delete(doc)}}}

function TrapFocus({children,open,disableAutoFocus=false,disableEnforceFocus=false,disableRestoreFocus=false,isEnabled=always,getTabbable=tabbables}){
 const node=React.useRef(null),before=React.useRef(null),after=React.useRef(null),epoch=React.useRef(0),current=React.useRef();
 current.current={disableEnforceFocus,disableRestoreFocus,isEnabled,getTabbable};
 const ref=useRefs(node,children.props.ref);
 React.useEffect(()=>{
  if(!open||!node.current)return;
  const root=node.current,doc=root.ownerDocument,previous=doc.activeElement,turn=++epoch.current,owner=enter(doc,root,false);
  let active=!disableAutoFocus,last=root,live=true;
  const focusRoot=()=>{if(!root.hasAttribute("tabindex"))root.setAttribute("tabindex","-1");root.focus()};
  if(active&&!root.contains(doc.activeElement))focusRoot();
  function contain(event){
   if(root.contains(event.target)){active=true;last=event.target;return}
   if(!active||!owner.top()||current.current.disableEnforceFocus||!current.current.isEnabled())return;
   const items=current.current.getTabbable(root);
   if(event.target===before.current){(items.at(-1)||root).focus();return}
   if(event.target===after.current){(items[0]||root).focus();return}
   queueMicrotask(()=>{if(live&&owner.top()&&current.current.isEnabled()&&!current.current.disableEnforceFocus&&!root.contains(doc.activeElement))(last.isConnected?last:root).focus()});
  }
  function key(event){
   if(event.key!=="Tab"||event.defaultPrevented||!active||!owner.top()||current.current.disableEnforceFocus||!current.current.isEnabled())return;
   const items=current.current.getTabbable(root),focused=doc.activeElement;
   if(!items.length){event.preventDefault();focusRoot()}
   else if(event.shiftKey&&(focused===items[0]||focused===root)){event.preventDefault();items.at(-1).focus()}
   else if(!event.shiftKey&&(focused===items.at(-1)||focused===root)){event.preventDefault();items[0].focus()}
  }
  doc.addEventListener("focusin",contain);doc.addEventListener("keydown",key);
  return()=>{live=false;owner.release();doc.removeEventListener("focusin",contain);doc.removeEventListener("keydown",key);queueMicrotask(()=>{if(epoch.current===turn&&!current.current.disableRestoreFocus&&previous?.isConnected)previous.focus()})};
 },[open,disableAutoFocus]);
 const style={position:"fixed",width:1,height:1,opacity:0,padding:0,overflow:"hidden"};
 return h(React.Fragment,null,h("div",{ref:before,tabIndex:open?0:-1,"data-testid":"sentinelStart",style}),React.cloneElement(children,{ref}),h("div",{ref:after,tabIndex:open?0:-1,"data-testid":"sentinelEnd",style}));
}
module.exports={TrapFocus};
