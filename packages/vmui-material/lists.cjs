'use strict';
const React = require('react');
const {styled,useThemeProps} = require('./theme.cjs');
const {ButtonBase} = require('./buttons.cjs');
const {Typography} = require('./text.cjs');
const h=React.createElement, empty=Object.freeze({});
const Context=React.createContext(empty);
const layout=typeof document==='undefined'?React.useEffect:React.useLayoutEffect;
const join=(...parts)=>parts.filter(Boolean).join(' ');
const stateSlots=new Set(['disabled','selected','focusVisible']);
const utility=(name,slot)=>(stateSlots.has(slot)?'Mui':'Mui'+name)+'-'+slot;
const classes=(name,keys,custom=empty)=>keys.filter(Boolean).map(key=>join(utility(name,key),Object.hasOwn(custom,key)&&custom[key])).join(' ');
const resolve=(p,state)=>typeof p==='function'?p(state):p||empty;
function useRefs(a,b){return React.useMemo(()=>node=>{const refs=[a,b],clean=refs.map(ref=>typeof ref==='function'?ref(node):ref&&(ref.current=node));return()=>refs.forEach((ref,i)=>{if(typeof clean[i]==='function')clean[i]();else if(typeof ref==='function')ref(null);else if(ref)ref.current=null;});},[a,b]);}
const palette=theme=>theme.vars?.palette||theme.palette;
const tint=(color,alpha)=>`rgb(from ${color} r g b / ${alpha})`;
const ListRoot=styled('ul',{name:'MuiList',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.dense&&o.dense,!s.disablePadding&&o.padding,s.subheader&&o.subheader]})(({ownerState:s})=>({listStyle:'none',margin:0,padding:0,position:'relative',...(!s.disablePadding?{paddingTop:s.subheader?0:8,paddingBottom:8}:{})}));
const List=React.forwardRef(function List(input,ref){
 const p=useThemeProps({props:input,name:'MuiList'}),{component='ul',dense=false,disablePadding=false,subheader,children,classes:custom,className,...rest}=p;
 const value=React.useMemo(()=>({dense}),[dense]);
 return h(Context.Provider,{value},h(ListRoot,{...rest,as:component,ref,ownerState:{...p,dense,disablePadding,subheader},className:join(classes('List',['root',dense&&'dense',!disablePadding&&'padding',subheader&&'subheader'],custom),className)},subheader,children));
});
const ItemRoot=styled(ButtonBase,{name:'MuiMenuItem',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.dense&&o.dense,!s.disableGutters&&o.gutters,s.divider&&o.divider]})(({theme,ownerState:s})=>{
 const p=palette(theme),selected=p.action.selectedOpacity??.08,hover=p.action.hoverOpacity??.04,focus=p.action.focusOpacity??.12;
 return {...theme.typography.body1,display:'flex',justifyContent:'flex-start',alignItems:'center',position:'relative',textDecoration:'none',boxSizing:'border-box',whiteSpace:'nowrap',minHeight:s.dense?32:48,paddingTop:6,paddingBottom:6,...(!s.disableGutters?{paddingLeft:16,paddingRight:16}:{}),
 '&:hover':{textDecoration:'none',backgroundColor:p.action.hover,'@media (hover: none)':{backgroundColor:'transparent'}},
 '&.Mui-selected':{backgroundColor:tint(p.primary.main,selected),'&.Mui-focusVisible':{backgroundColor:tint(p.primary.main,`calc(${selected} + ${focus})`)},'&:hover':{backgroundColor:tint(p.primary.main,`calc(${selected} + ${hover})`),'@media (hover: none)':{backgroundColor:tint(p.primary.main,selected)}}},
 '&.Mui-focusVisible':{backgroundColor:p.action.focus},'&.Mui-disabled':{opacity:p.action.disabledOpacity??.38},
 '& + .MuiDivider-root':{marginTop:8,marginBottom:8},'& + .MuiDivider-inset':{marginLeft:52},'& .MuiListItemText-root':{marginTop:0,marginBottom:0},'& .MuiListItemText-inset':{paddingLeft:36},'& .MuiListItemIcon-root':{minWidth:36},
 ...(s.divider?{borderBottom:'1px solid '+p.divider,backgroundClip:'padding-box'}:{}),
 ...(s.dense?{...theme.typography.body2,paddingTop:4,paddingBottom:4,'& .MuiListItemIcon-root svg':{fontSize:'1.25rem'}}:{[theme.breakpoints.up('sm')]:{minHeight:'auto'}})};
});
const MenuItem=React.forwardRef(function MenuItem(input,forwarded){
 const p=useThemeProps({props:input,name:'MuiMenuItem'}),parent=React.useContext(Context);
 const {component='li',autoFocus=false,dense=false,disableGutters=false,divider=false,disabled=false,selected=false,classes:custom,className,children,tabIndex=-1,...rest}=p;
 const state={...p,dense:dense||parent.dense||false,disableGutters,divider,disabled,selected},local=React.useRef(null),ref=useRefs(local,forwarded),value=React.useMemo(()=>({dense:state.dense,disableGutters}),[state.dense,disableGutters]);
 layout(()=>{if(autoFocus&&!disabled)local.current?.focus();},[autoFocus,disabled]);
 return h(Context.Provider,{value},h(ItemRoot,{...rest,component,role:rest.role||'menuitem',disabled,tabIndex,ref,ownerState:state,focusVisibleClassName:join(custom?.focusVisible,rest.focusVisibleClassName),className:join(classes('MenuItem',['root',state.dense&&'dense',!disableGutters&&'gutters',divider&&'divider',disabled&&'disabled',selected&&'selected'],custom),className)},children));
});
const ListButtonRoot=styled(ButtonBase,{name:'MuiListItemButton',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.dense&&o.dense,s.alignItems==='flex-start'&&o.alignItemsFlexStart,!s.disableGutters&&o.gutters,s.divider&&o.divider]})(({theme,ownerState:s})=>{
 const p=palette(theme),selected=p.action.selectedOpacity??.08,hover=p.action.hoverOpacity??.04,focus=p.action.focusOpacity??.12;
 return {display:'flex',flexGrow:1,justifyContent:'flex-start',alignItems:s.alignItems,position:'relative',textDecoration:'none',minWidth:0,boxSizing:'border-box',textAlign:'left',paddingTop:s.dense?4:8,paddingBottom:s.dense?4:8,...(!s.disableGutters?{paddingLeft:16,paddingRight:16}:{}),
 transition:theme.transitions?.create?.('background-color',{duration:theme.transitions.duration.shortest})||'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
 '&:hover':{textDecoration:'none',backgroundColor:p.action.hover,'@media (hover: none)':{backgroundColor:'transparent'}},
 '&.Mui-selected':{backgroundColor:tint(p.primary.main,selected),'&.Mui-focusVisible':{backgroundColor:tint(p.primary.main,`calc(${selected} + ${focus})`)},'&:hover':{backgroundColor:tint(p.primary.main,`calc(${selected} + ${hover})`),'@media (hover: none)':{backgroundColor:tint(p.primary.main,selected)}}},
 '&.Mui-focusVisible':{backgroundColor:p.action.focus},'&.Mui-disabled':{opacity:p.action.disabledOpacity??.38},
 ...(s.divider?{borderBottom:'1px solid '+p.divider,backgroundClip:'padding-box'}:{})};
});
const ListItemButton=React.forwardRef(function ListItemButton(input,forwarded){
 const p=useThemeProps({props:input,name:'MuiListItemButton'}),parent=React.useContext(Context);
 const {component='div',alignItems='center',autoFocus=false,dense=false,disableGutters=false,divider=false,disabled=false,selected=false,classes:custom,className,children,focusVisibleClassName,...rest}=p;
 const state={...p,alignItems,dense:!!(dense||parent.dense),disableGutters,divider,disabled,selected};
 const local=React.useRef(null),ref=useRefs(local,forwarded),value=React.useMemo(()=>({dense:state.dense,alignItems,disableGutters}),[state.dense,alignItems,disableGutters]);
 layout(()=>{if(autoFocus&&!disabled)local.current?.focus()},[autoFocus,disabled]);
 return h(Context.Provider,{value},h(ListButtonRoot,{...rest,component:(rest.href||rest.to)&&component==='div'?'button':component,disabled,ref,ownerState:state,focusVisibleClassName:join(custom?.focusVisible,focusVisibleClassName),className:join(classes('ListItemButton',['root',state.dense&&'dense',alignItems==='flex-start'&&'alignItemsFlexStart',!disableGutters&&'gutters',divider&&'divider',disabled&&'disabled',selected&&'selected'],custom),className)},children));
});
const IconRoot=styled('div',{name:'MuiListItemIcon',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.alignItems==='flex-start'&&o.alignItemsFlexStart]})(({theme,ownerState:s})=>({minWidth:36,color:palette(theme).action.active,flexShrink:0,display:'inline-flex',...(s.alignItems==='flex-start'?{marginTop:8}:{})}));
const ListItemIcon=React.forwardRef(function ListItemIcon(input,ref){const p=useThemeProps({props:input,name:'MuiListItemIcon'}),state={...p,...React.useContext(Context)},{children,classes:custom,className,...rest}=p;return h(IconRoot,{...rest,ref,ownerState:state,className:join(classes('ListItemIcon',['root',state.alignItems==='flex-start'&&'alignItemsFlexStart'],custom),className)},children);});
const TextRoot=styled('div',{name:'MuiListItemText',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.dense&&o.dense,s.inset&&o.inset,s.multiline&&o.multiline]})(({ownerState:s})=>({flex:'1 1 auto',minWidth:0,marginTop:s.multiline?6:4,marginBottom:s.multiline?6:4,...(s.inset?{paddingLeft:56}:{}),'& .MuiListItemText-primary, & .MuiListItemText-secondary':{display:'block'}}));
const ListItemText=React.forwardRef(function ListItemText(input,forwarded){
 const p=useThemeProps({props:input,name:'MuiListItemText'}),context=React.useContext(Context),{children,primary=children,secondary,disableTypography=false,inset=false,classes:custom,className,slots=empty,slotProps=empty,primaryTypographyProps,secondaryTypographyProps,...rest}=p;
 const state={...p,dense:context.dense||false,inset,multiline:!!(primary&&secondary)},root=resolve(slotProps.root,state),ref=useRefs(forwarded,root.ref);
 const wrap=(value,key)=>{if(value==null||value===false)return value;if(disableTypography||React.isValidElement(value)&&value.type===Typography)return value;const Component=slots[key]||Typography,props=resolve(slotProps[key]??(key==='primary'?primaryTypographyProps:secondaryTypographyProps),state);return h(Component,{...(typeof Component==='string'?{}:{variant:key==='primary'&&!state.dense?'body1':'body2',component:key==='primary'?'span':'p',...(key==='secondary'?{color:'text.secondary'}:{})}),...props,className:join(classes('ListItemText',[key],custom),props.className)},value);};
 return h(slots.root||TextRoot,{...rest,...root,ref,...(!slots.root||typeof slots.root!=='string'?{ownerState:state}:{}),className:join(classes('ListItemText',['root',state.dense&&'dense',inset&&'inset',state.multiline&&'multiline'],custom),className,root.className)},wrap(primary,'primary'),wrap(secondary,'secondary'));
});
const HeaderRoot=styled('li',{name:'MuiListSubheader',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.color!=='default'&&o['color'+s.color[0].toUpperCase()+s.color.slice(1)],!s.disableGutters&&o.gutters,s.inset&&o.inset,!s.disableSticky&&o.sticky]})(({theme,ownerState:s})=>({boxSizing:'border-box',lineHeight:'48px',listStyle:'none',color:s.color==='inherit'?'inherit':s.color==='primary'?palette(theme).primary.main:palette(theme).text.secondary,fontFamily:theme.typography.fontFamily,fontWeight:theme.typography.fontWeightMedium,fontSize:theme.typography.pxToRem?.(14)||'0.875rem',...(!s.disableGutters?{paddingLeft:16,paddingRight:16}:{}),...(s.inset?{paddingLeft:72}:{}),...(!s.disableSticky?{position:'sticky',top:0,zIndex:1,backgroundColor:palette(theme).background.paper}:{})}));
const ListSubheader=React.forwardRef(function ListSubheader(input,ref){const p=useThemeProps({props:input,name:'MuiListSubheader'}),{component='li',color='default',disableGutters=false,disableSticky=false,inset=false,children,classes:custom,className,...rest}=p,state={...p,color,disableGutters,disableSticky,inset};return h(HeaderRoot,{...rest,as:component,ref,ownerState:state,className:join(classes('ListSubheader',['root',color!=='default'&&'color'+color[0].toUpperCase()+color.slice(1),!disableGutters&&'gutters',!disableSticky&&'sticky',inset&&'inset'],custom),className)},children);});
ListSubheader.muiSkipListHighlight=true;
function focusableItems(list,disabledItemsFocusable){return [...list.querySelectorAll('[tabindex]')].filter(el=>el.closest('[role="menu"],[role="listbox"]')===list&&!el.hidden&&el.getAttribute('aria-hidden')!=='true'&&(!el.hasAttribute('disabled')&&el.getAttribute('aria-disabled')!=='true'||disabledItemsFocusable));}
const MenuList=React.forwardRef(function MenuList(input,forwarded){
 const {autoFocus=false,autoFocusItem=false,disabledItemsFocusable=false,disableListWrap=false,variant='selectedMenu',children,onKeyDown,...rest}=input,local=React.useRef(null),ref=useRefs(local,forwarded),typing=React.useRef({text:'',at:0});
 layout(()=>{const list=local.current;if(!list)return;if(autoFocusItem){const items=focusableItems(list,disabledItemsFocusable),selected=variant==='selectedMenu'&&items.find(el=>el.classList.contains('Mui-selected'));(selected||items[0]||list).focus();}else if(autoFocus)list.focus();},[]);
 function keydown(event){
  onKeyDown?.(event);if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey)return;
  const list=local.current;if(!list||event.target.closest('[role="menu"],[role="listbox"]')!==list)return;
  const items=focusableItems(list,disabledItemsFocusable),active=list.ownerDocument.activeElement,index=items.indexOf(active),key=event.key;let next;
  if(key==='ArrowDown'||key==='ArrowUp'){const step=key==='ArrowDown'?1:-1;next=index<0?(step>0?0:items.length-1):index+step;if(next<0||next>=items.length)next=disableListWrap?Math.max(0,Math.min(items.length-1,next)):(next+items.length)%items.length;}
  else if(key==='Home')next=0;else if(key==='End')next=items.length-1;
  else if(key.length===1&&key!==' '){const now=Date.now(),prev=typing.current;const text=now-prev.at>500?key.toLowerCase():prev.text+key.toLowerCase();typing.current={text,at:now};const repeated=[...text].every(c=>c===text[0]),needle=repeated?text[0]:text,start=repeated?index+1:Math.max(0,index);for(let n=0;n<items.length;n++){const candidate=(start+n)%items.length;if(items[candidate].textContent.trim().toLowerCase().startsWith(needle)){next=candidate;break;}}}
  if(next!==undefined){event.preventDefault();items[next]?.focus();}
 }
 return h(List,{role:'menu',tabIndex:-1,...rest,ref,onKeyDown:keydown},children);
});
const RowRoot = styled('li', {
  name: 'MuiListItem', slot: 'Root',
  overridesResolver: ({ ownerState: s }, o) => [o.root, s.dense && o.dense, !s.disableGutters && o.gutters,
    !s.disablePadding && o.padding, s.alignItems === 'flex-start' && o.alignItemsFlexStart, s.divider && o.divider],
})(({ ownerState: s, theme }) => ({
  display: 'flex', justifyContent: 'flex-start', alignItems: s.alignItems, position: 'relative',
  textDecoration: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'left',
  ...(!s.disablePadding && { paddingTop: s.dense ? 4 : 8, paddingBottom: s.dense ? 4 : 8,
    ...(!s.disableGutters && { paddingLeft: 16, paddingRight: 16 }),
    ...(s.secondaryAction && { paddingRight: 48 }),
  }),
  ...(s.secondaryAction && { '& > .MuiListItemButton-root': { paddingRight: 48 } }),
  ...(s.divider && { borderBottom: '1px solid ' + palette(theme).divider, backgroundClip: 'padding-box' }),
}));
const RowAction = styled('div', { name: 'MuiListItemSecondaryAction', slot: 'Root',
  overridesResolver: ({ownerState}, o) => [o.root, ownerState.disableGutters && o.disableGutters],
})(({ ownerState }) => ({
  position: 'absolute', right: ownerState.disableGutters ? 0 : 16, top: '50%', transform: 'translateY(-50%)',
}));
const ListItem = React.forwardRef(function ListItem(input, forwarded) {
  const props = useThemeProps({ props: input, name: 'MuiListItem' });
  const { children, component = 'li', alignItems = 'center', dense = false, disableGutters = false,
    disablePadding = false, divider = false, secondaryAction, slots = empty, slotProps = empty,
    classes: custom, className, ...other } = props;
  const parent = React.useContext(Context);
  const compact = dense || !!parent.dense;
  const value = React.useMemo(() => ({dense: compact, alignItems, disableGutters}), [compact, alignItems, disableGutters]);
  const state = {...props, dense: compact, alignItems, disableGutters, disablePadding, divider};
  const root = resolve(slotProps.root, state), action = resolve(slotProps.secondaryAction, state);
  const ref = useRefs(forwarded, root.ref);
  const Root = slots.root || RowRoot, Action = slots.secondaryAction || RowAction;
  const names = ['root', compact && 'dense', !disableGutters && 'gutters', !disablePadding && 'padding',
    divider && 'divider', alignItems === 'flex-start' && 'alignItemsFlexStart'];
  return h(Context.Provider, {value}, h(Root, {
    ...other, ...root, as: component, ref, ...(typeof Root !== 'string' && {ownerState: state}),
    className: join(classes('ListItem', names, custom), className, root.className),
  }, children, secondaryAction && h(Action, {
    ...action, ...(typeof Action !== 'string' && {ownerState: state}),
    className: join(!slots.secondaryAction && 'MuiListItemSecondaryAction-root',
      !slots.secondaryAction && disableGutters && 'MuiListItemSecondaryAction-disableGutters',
      classes('ListItem', ['secondaryAction'], custom), action.className),
  }, secondaryAction)));
});

const api={ListItem,List,MenuItem,MenuList,ListItemIcon,ListItemText,ListSubheader,ListItemButton};
const slots={ListItem:['root','dense','alignItemsFlexStart','divider','gutters','padding','secondaryAction'],List:['root','padding','dense','subheader'],ListItemButton:['root','focusVisible','dense','alignItemsFlexStart','disabled','divider','gutters','selected'],MenuItem:['root','dense','disabled','gutters','divider','selected','focusVisible'],ListItemIcon:['root','alignItemsFlexStart'],ListItemText:['root','multiline','dense','inset','primary','secondary'],ListSubheader:['root','colorPrimary','colorInherit','gutters','inset','sticky']};
for(const [name,keys]of Object.entries(slots)){api[name].displayName=name;api['get'+name+'UtilityClass']=slot=>utility(name,slot);api[name[0].toLowerCase()+name.slice(1)+'Classes']=Object.freeze(Object.fromEntries(keys.map(slot=>[slot,utility(name,slot)])));}
MenuList.displayName='MenuList';
module.exports=api;
