'use strict';
const React=require('react'),{createPortal}=require('react-dom');
const {styled,useTheme,useThemeProps}=require('./theme.cjs');
const {Paper}=require('./surfaces.cjs');
const {MenuList}=require('./lists.cjs');
const h=React.createElement,empty=Object.freeze({}),layout=typeof document==='undefined'?React.useEffect:React.useLayoutEffect;
const join=(...parts)=>parts.filter(Boolean).join(' '),resolve=(p,s)=>typeof p==='function'?p(s):p||empty;
function useRefs(a,b){return React.useMemo(()=>node=>{const refs=[a,b],clean=refs.map(ref=>typeof ref==='function'?ref(node):ref&&(ref.current=node));return()=>refs.forEach((ref,i)=>{if(typeof clean[i]==='function')clean[i]();else if(typeof ref==='function')ref(null);else if(ref)ref.current=null;});},[a,b]);}
// Overlays share ownership per document, including iframe documents. Closing one
// must not unlock scrolling or expose a sibling behind another open overlay.
const documents=new WeakMap();
function enter(doc,root,lock){
 let state=documents.get(doc);if(!state){state={entries:[],hidden:new Map(),scroll:null};documents.set(doc,state);}
 const entry={root,lock};state.entries.push(entry);
 function sync(){
  for(const [node,value]of state.hidden){if(value===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',value);}state.hidden.clear();
  const top=state.entries.at(-1)?.root;
  if(top)for(const node of doc.body.children)if(!node.contains(top)&&!['SCRIPT','STYLE','LINK'].includes(node.tagName)&&!node.hasAttribute('aria-live')){state.hidden.set(node,node.getAttribute('aria-hidden'));node.setAttribute('aria-hidden','true');}
  const needs=state.entries.some(e=>e.lock);
  if(needs&&!state.scroll){const body=doc.body,view=doc.defaultView,width=Math.max(0,view.innerWidth-doc.documentElement.clientWidth);state.scroll={overflow:body.style.overflow,paddingRight:body.style.paddingRight};body.style.overflow='hidden';if(width)body.style.paddingRight=(parseFloat(view.getComputedStyle(body).paddingRight)||0)+width+'px';}
  if(!needs&&state.scroll){Object.assign(doc.body.style,state.scroll);state.scroll=null;}
 }
 sync();return {top:()=>state.entries.at(-1)===entry,release(){const i=state.entries.indexOf(entry);if(i>=0)state.entries.splice(i,1);sync();if(!state.entries.length)documents.delete(doc);}};
}
const Root=styled('div',{name:'MuiPopover',slot:'Root',overridesResolver:(_,o)=>o.root})(({theme})=>({position:'fixed',inset:0,zIndex:theme.zIndex?.modal??1300}));
const Sheet=styled(Paper,{name:'MuiPopover',slot:'Paper',overridesResolver:(_,o)=>o.paper})({position:'absolute',overflowY:'auto',overflowX:'hidden',minWidth:16,minHeight:16,maxWidth:'calc(100% - 32px)',maxHeight:'calc(100% - 32px)',outline:0});
const point=(value,length)=>typeof value==='number'?value:value==='center'?length/2:value==='bottom'||value==='right'?length:0;
const tabbables=node=>[...node.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(el=>el.tabIndex>=0&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&!el.hidden&&el.getClientRects().length);
const Popover=React.forwardRef(function Popover(input,forwarded){
 const p=useThemeProps({props:input,name:'MuiPopover'}),theme=useTheme();
 const {open,anchorEl,anchorOrigin={vertical:'top',horizontal:'left'},transformOrigin={vertical:'top',horizontal:'left'},anchorReference='anchorEl',anchorPosition,marginThreshold=16,container,disablePortal=false,keepMounted=false,disableAutoFocus=false,disableEnforceFocus=false,disableRestoreFocus=false,disableEscapeKeyDown=false,disableScrollLock=false,hideBackdrop=false,onClose,children,action,elevation=8,classes=empty,className,slots=empty,slotProps=empty,PaperProps,BackdropProps,TransitionProps,transitionDuration='auto',onKeyDown,...rest}=p;
 if(slots.transition)throw new TypeError('Custom Popover transition slots are outside the verified menu contract');
 const [host,setHost]=React.useState(null),root=React.useRef(null),paper=React.useRef(null),previous=React.useRef(null),wasOpen=React.useRef(false),current=React.useRef(p);current.current=p;
 const sheetProps=resolve(slotProps.paper??PaperProps,p),rootProps=resolve(slotProps.root,p),backdropProps=resolve(slotProps.backdrop??BackdropProps,p),transition=resolve(slotProps.transition??TransitionProps,p);
 const rootRef=useRefs(root,forwarded),combinedRoot=useRefs(rootRef,rootProps.ref),paperRef=useRefs(paper,sheetProps.ref);
 layout(()=>{if(!open)wasOpen.current=false;if(!open&&!keepMounted)return;const anchor=typeof anchorEl==='function'?anchorEl():anchorEl,target=typeof container==='function'?container():container;const doc=target?.ownerDocument||anchor?.ownerDocument||(typeof document!=='undefined'?document:null);if(!doc)return;if(open&&!wasOpen.current&&!previous.current)previous.current=doc.activeElement;wasOpen.current=!!open;setHost(target||doc.body);},[open,container,anchorEl,keepMounted]);
 const update=React.useCallback(()=>{
  const node=paper.current;if(!node)return;const c=current.current,anchor=typeof c.anchorEl==='function'?c.anchorEl():c.anchorEl,doc=node.ownerDocument,win=doc.defaultView;
  const ao=c.anchorOrigin||{vertical:'top',horizontal:'left'},to=c.transformOrigin||{vertical:'top',horizontal:'left'},bounds=anchor?.getBoundingClientRect?.()||doc.body.getBoundingClientRect(),w=node.offsetWidth,height=node.offsetHeight;
  let x=point(to.horizontal,w),y=point(to.vertical,height),left,top;
  if(c.anchorReference==='none'){node.style.transformOrigin=x+'px '+y+'px';return;}
  if(c.anchorReference==='anchorPosition'){left=(c.anchorPosition?.left??0)-x;top=(c.anchorPosition?.top??0)-y;}
  else {left=bounds.left+point(ao.horizontal,bounds.width)-x;top=bounds.top+point(ao.vertical,bounds.height)-y;}
  const margin=c.marginThreshold===undefined?16:c.marginThreshold;
  if(margin!==null){const nx=Math.min(Math.max(left,margin),Math.max(margin,win.innerWidth-w-margin)),ny=Math.min(Math.max(top,margin),Math.max(margin,win.innerHeight-height-margin));x+=left-nx;y+=top-ny;left=nx;top=ny;}
  node.style.left=Math.round(left)+'px';node.style.top=Math.round(top)+'px';node.style.transformOrigin=x+'px '+y+'px';
 },[]);
 React.useImperativeHandle(action,()=>open?{updatePosition:update}:null,[open,update]);
 layout(()=>{if(open&&host)update();});
 layout(()=>{
  if(!open||!host||!root.current||!paper.current)return;
  const node=paper.current,doc=node.ownerDocument,view=doc.defaultView,manager=enter(doc,root.current,!disableScrollLock);let last=node,timer,frame;
  update();if(!disableAutoFocus&&!node.contains(doc.activeElement))node.focus();
  const focus=event=>{if(node.contains(event.target)){last=event.target;return;}if(manager.top()&&!current.current.disableEnforceFocus)(last.isConnected?last:node).focus();};
  const key=event=>{if(!manager.top()||event.defaultPrevented)return;if(event.key==='Escape'){if(!current.current.disableEscapeKeyDown){event.stopPropagation();current.current.onClose?.(event,'escapeKeyDown');}}else if(event.key==='Tab'&&!current.current.disableEnforceFocus){const items=tabbables(node);if(!items.length){event.preventDefault();node.focus();}else if(event.shiftKey&&(doc.activeElement===items[0]||doc.activeElement===node)){event.preventDefault();items.at(-1).focus();}else if(!event.shiftKey&&doc.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}}};
  doc.addEventListener('focusin',focus);doc.addEventListener('keydown',key);view.addEventListener('resize',update);view.addEventListener('scroll',update,true);
  const observer=view.ResizeObserver?new view.ResizeObserver(update):null;observer?.observe(node);
  const callbacks=transition;callbacks.onEnter?.(node,true);
  const duration=typeof transitionDuration==='number'?transitionDuration:transitionDuration==='auto'?(theme.transitions?.getAutoHeightDuration?.(node.clientHeight)||0):(transitionDuration?.enter||0);
  if(duration){node.style.opacity='0';node.style.transform='scale(.75,.5625)';node.style.transition=`opacity ${duration}ms, transform ${duration}ms`;frame=view.requestAnimationFrame(()=>{node.style.opacity='1';node.style.transform='none';callbacks.onEntering?.(node,true);});timer=view.setTimeout(()=>callbacks.onEntered?.(node,true),duration);}else{callbacks.onEntering?.(node,true);callbacks.onEntered?.(node,true);}
  return()=>{doc.removeEventListener('focusin',focus);doc.removeEventListener('keydown',key);view.removeEventListener('resize',update);view.removeEventListener('scroll',update,true);observer?.disconnect();view.cancelAnimationFrame(frame);view.clearTimeout(timer);manager.release();callbacks.onExit?.(node);callbacks.onExited?.(node);const target=previous.current;previous.current=null;if(!current.current.disableRestoreFocus&&target?.isConnected)target.focus();};
 },[open,host,disableScrollLock,update]);
 if(!host||!open&&!keepMounted)return null;
 const RootSlot=slots.root||Root,PaperSlot=slots.paper||Sheet,Backdrop=slots.backdrop||'div';
 const body=h(RootSlot,{role:'presentation',...rest,...rootProps,ref:combinedRoot,ownerState:typeof RootSlot==='string'?undefined:p,onFocusCapture:event=>{if(!previous.current&&event.relatedTarget&&!root.current?.contains(event.relatedTarget))previous.current=event.relatedTarget;rest.onFocusCapture?.(event);rootProps.onFocusCapture?.(event);},onKeyDown:event=>{onKeyDown?.(event);rootProps.onKeyDown?.(event);},className:join('MuiPopover-root','MuiModal-root',classes.root,className,rootProps.className),style:{...rest.style,...rootProps.style,...(!open?{display:'none'}:{})}},
  !hideBackdrop?h(Backdrop,{'aria-hidden':true,...backdropProps,className:join('MuiBackdrop-root','MuiBackdrop-invisible',backdropProps.className),style:{position:'fixed',inset:0,backgroundColor:'transparent',zIndex:-1,WebkitTapHighlightColor:'transparent',...backdropProps.style},onClick:event=>{backdropProps.onClick?.(event);if(event.target===event.currentTarget&&!event.defaultPrevented)onClose?.(event,'backdropClick');}}):null,
  h(PaperSlot,{elevation,tabIndex:-1,...sheetProps,ref:paperRef,ownerState:typeof PaperSlot==='string'?undefined:p,className:join('MuiPopover-paper',classes.paper,sheetProps.className)},children));
 return disablePortal?body:createPortal(body,host);
});
const MenuPaper=styled(Sheet,{name:'MuiMenu',slot:'Paper',overridesResolver:(_,o)=>o.paper})({maxHeight:'calc(100% - 96px)',WebkitOverflowScrolling:'touch'});
const MenuRoot=styled(Popover,{name:'MuiMenu',slot:'Root',overridesResolver:(_,o)=>o.root})({});
const MenuListRoot=styled(MenuList,{name:'MuiMenu',slot:'List',overridesResolver:(_,o)=>o.list})({outline:0});
const Menu=React.forwardRef(function Menu(input,ref){
 const p=useThemeProps({props:input,name:'MuiMenu'}),theme=useTheme(),{autoFocus=true,disableAutoFocusItem=false,variant='selectedMenu',open,children,onClose,classes=empty,className,slots=empty,slotProps=empty,MenuListProps,PaperProps,PopoverClasses,...rest}=p;
 const list=resolve(slotProps.list??MenuListProps,p),paper=resolve(slotProps.paper??PaperProps,p),ListSlot=slots.list||MenuListRoot,side=theme.direction==='rtl'?'right':'left';
 return h(MenuRoot,{anchorOrigin:{vertical:'bottom',horizontal:side},transformOrigin:{vertical:'top',horizontal:side},...rest,open,onClose,ref,classes:PopoverClasses,className:join('MuiMenu-root',classes.root,className),slots:{...slots,paper:slots.paper||MenuPaper},slotProps:{...slotProps,paper:{...paper,className:join('MuiMenu-paper',classes.paper,paper.className)}}},h(ListSlot,{autoFocus:autoFocus&&(disableAutoFocusItem||!React.Children.count(children)),autoFocusItem:autoFocus&&!disableAutoFocusItem,variant,...list,className:join('MuiMenu-list',classes.list,list.className),onKeyDown:event=>{list.onKeyDown?.(event);if(!event.defaultPrevented&&event.key==='Tab'){event.preventDefault();onClose?.(event,'tabKeyDown');}}},children));
});
Popover.displayName='Popover';Menu.displayName='Menu';
module.exports={Popover,Menu,MenuPaper,popoverClasses:Object.freeze({root:'MuiPopover-root',paper:'MuiPopover-paper'}),menuClasses:Object.freeze({root:'MuiMenu-root',paper:'MuiMenu-paper',list:'MuiMenu-list'}),getPopoverUtilityClass:slot=>'MuiPopover-'+slot,getMenuUtilityClass:slot=>'MuiMenu-'+slot};
