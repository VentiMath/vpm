'use strict';
const React=require('react');
const {styled,useThemeProps}=require('./theme.cjs');
const {ButtonBase}=require('./buttons.cjs');
const {SvgIcon}=require('./text.cjs');
const {alpha,darken}=require('vmui-system');
const h=React.createElement,empty=Object.freeze({}),join=(...v)=>v.filter(Boolean).join(' '),cap=v=>v[0].toUpperCase()+v.slice(1);
const utility=s=>s==='disabled'||s==='focusVisible'?'Mui-'+s:'MuiChip-'+s;
const names=['root','sizeSmall','sizeMedium',...['Default','Error','Info','Primary','Secondary','Success','Warning'].map(c=>'color'+c),'disabled','clickable','deletable','outlined','filled','avatar','icon','label','deleteIcon','focusVisible'];
const chipClasses=Object.freeze(Object.fromEntries(names.map(s=>[s,utility(s)])));
const classes=(slots,custom)=>join(...slots.filter(Boolean).map(s=>join(utility(s),Object.hasOwn(custom,s)&&custom[s])));
const resolve=(p,s)=>typeof p==='function'?p(s):p||empty;
function tint(c,a){return /var\(|calc\(/.test(c+String(a))?`rgb(from ${c} r g b / ${a})`:alpha(c,a);}
function useRefs(a,b,c){return React.useMemo(()=>node=>{const refs=[a,b,c],clean=refs.map(r=>typeof r==='function'?r(node):r&&(r.current=node));return()=>refs.forEach((r,i)=>{if(typeof clean[i]==='function')clean[i]();else if(typeof r==='function')r(null);else if(r)r.current=null;});},[a,b,c]);}
const Root=styled('div',{name:'MuiChip',slot:'Root',overridesResolver:({ownerState:s},o)=>[
 o.root,o['size'+cap(s.size)],o['color'+cap(s.color)],s.clickable&&o.clickable,s.onDelete&&o.deletable,o[s.variant],
 ...['avatar','icon','deleteIcon'].map(key=>o[key]&&{['& .MuiChip-'+key]:o[key]})
]})(({theme,ownerState:s})=>{
 const p=theme.vars?.palette||theme.palette,raw=theme.palette,dark=raw.mode==='dark',small=s.size==='small',outline=s.variant==='outlined',action=p.action||empty;
 const colored=s.color!=='default'&&Object.hasOwn(p,s.color)&&p[s.color]?.main,c=colored?p[s.color]:null;
 const ink=p.text.primary,base=dark?'#fff':'#000',hover=action.hoverOpacity??(dark?.08:.04),focus=action.focusOpacity??.12,selected=action.selectedOpacity??(dark?.16:.08);
 const sum=(a,b)=>typeof a==='number'&&typeof b==='number'?a+b:`calc(${a} + ${b})`;
 const contrast=c?.contrastText||'#fff',deep=c&&(c.dark||darken(raw[s.color].main,.2));
 const avatar={marginLeft:small?4:5,marginRight:small?-4:-6,width:small?18:24,height:small?18:24,fontSize:small?'.625rem':'.75rem',color:p.Chip?.defaultAvatarColor||(dark?'#e0e0e0':'#616161'),...(['primary','secondary'].includes(s.color)?{color:contrast,backgroundColor:deep}:{}),...(outline?{marginLeft:small?2:4}:{})};
 const icon={marginLeft:outline?(small?2:4):(small?4:5),marginRight:small?-4:-6,...(small?{fontSize:18}:{}),...(s.iconColor===s.color||s.iconColor==='default'?{color:c?'inherit':p.Chip?.defaultIconColor||(dark?'#e0e0e0':'#616161')}: {})};
 const deleteColor=c?(outline?c.main:contrast):ink;
 const deletion={WebkitTapHighlightColor:'transparent',color:tint(deleteColor,c ? .7 : .26),fontSize:small?16:22,cursor:'pointer',margin:`0 ${outline?(small?3:5):(small?4:5)}px 0 ${small?-4:-6}px`,'&:hover':{color:c?deleteColor:tint(ink,.4)},...(c?{'&:active':{color:deleteColor}}:{})};
 return {maxWidth:'100%',fontFamily:theme.typography.fontFamily,fontSize:theme.typography.pxToRem?.(13)||13/16+'rem',display:'inline-flex',alignItems:'center',justifyContent:'center',height:small?24:32,lineHeight:1.5,color:c?(outline?c.main:contrast):ink,backgroundColor:outline?'transparent':c?c.main:action.selected||tint(base,selected),borderRadius:16,whiteSpace:'nowrap',transition:theme.transitions?.create(['background-color','box-shadow'])||'background-color 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',cursor:s.clickable?'pointer':'unset',outline:0,textDecoration:'none',border:outline?`1px solid ${c?tint(c.main,.7):p.Chip?.defaultBorder||(dark?'#616161':'#bdbdbd')}`:0,padding:0,verticalAlign:'middle',boxSizing:'border-box','&.Mui-disabled':{opacity:action.disabledOpacity??.38,pointerEvents:'none'},'& .MuiChip-avatar':avatar,'& .MuiChip-icon':icon,'& .MuiChip-deleteIcon':deletion,
 ...(s.clickable?{userSelect:'none',WebkitTapHighlightColor:'transparent','&:hover':{backgroundColor:outline?tint(c?c.main:base,hover):c?deep:tint(base,sum(selected,hover))},'&:active':{boxShadow:theme.shadows?.[1]||'0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)'}}:{}),
 ...(s.clickable||s.onDelete?{'&.Mui-focusVisible':{backgroundColor:outline?tint(c?c.main:base,focus):c?deep:tint(base,sum(selected,focus))}}:{})};
});
const Label=styled('span',{name:'MuiChip',slot:'Label',overridesResolver:(_,o)=>o.label})(({ownerState:s})=>({overflow:'hidden',textOverflow:'ellipsis',paddingLeft:(s.size==='small'?8:12)-(s.variant==='outlined'?1:0),paddingRight:(s.size==='small'?8:12)-(s.variant==='outlined'?1:0),whiteSpace:'nowrap'}));
// The public Material cancel glyph is design data, not behavioral code.
const cancelPath='M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z';
const Chip=React.forwardRef(function Chip(input,forwardedRef){
 const p=useThemeProps({props:input,name:'MuiChip'});
 const {avatar,icon,label,deleteIcon,onDelete,onClick,onKeyDown,onKeyUp,clickable:requested,color='default',size='medium',variant='filled',disabled=false,skipFocusWhenDisabled=false,component='div',nativeButton,tabIndex,classes:custom=empty,className,slots=empty,slotProps=empty,children,...rest}=p;
 const clickable=requested??Boolean(onClick),interactive=clickable||Boolean(onDelete),state={...p,clickable,color,size,variant,disabled,iconColor:icon?.props.color||'default'},root=resolve(slotProps.root,state),labelProps=resolve(slotProps.label,state),node=React.useRef(null),ref=useRefs(node,forwardedRef,root.ref);
 const erase=e=>{e.stopPropagation();if(!disabled)onDelete?.(e)};
 const keyDown=e=>{if(e.target===e.currentTarget&&(e.key==='Delete'||e.key==='Backspace'))e.preventDefault();onKeyDown?.(e);root.onKeyDown?.(e)};
 const keyUp=e=>{if(e.target===e.currentTarget){if(!disabled&&(e.key==='Delete'||e.key==='Backspace'))onDelete?.(e)}onKeyUp?.(e);root.onKeyUp?.(e)};
 const RootSlot=slots.root||Root,LabelSlot=slots.label||Label;
 const rootProps={...rest,...root,ref,onClick:e=>{if(!disabled){onClick?.(e);root.onClick?.(e)}},onKeyDown:keyDown,onKeyUp:keyUp,tabIndex:disabled&&skipFocusWhenDisabled?-1:tabIndex,className:join(classes(['root',variant,disabled&&'disabled','size'+cap(size),'color'+cap(color),clickable&&'clickable',onDelete&&'deletable'],custom),className,root.className)};
 if(!slots.root){rootProps.as=interactive?ButtonBase:component;if(interactive)Object.assign(rootProps,{component,nativeButton,disabled:clickable&&disabled,disableRipple:Boolean(onDelete),focusVisibleClassName:classes(['focusVisible'],custom)});if(disabled&&onDelete)rootProps['aria-disabled']=true;}
 if(typeof RootSlot!=='string')rootProps.ownerState=state;else delete rootProps.ownerState;
 const labelOptions={...labelProps,className:join(classes(['label'],custom),labelProps.className)};if(typeof LabelSlot!=='string')labelOptions.ownerState=state;else delete labelOptions.ownerState;
 const visual=React.isValidElement(avatar)?React.cloneElement(avatar,{className:join(classes(['avatar'],custom),avatar.props.className)}):React.isValidElement(icon)?React.cloneElement(icon,{className:join(classes(['icon'],custom),icon.props.className)}):null;
 const deletion=onDelete?(React.isValidElement(deleteIcon)?React.cloneElement(deleteIcon,{className:join(classes(['deleteIcon'],custom),deleteIcon.props.className),onClick:erase}):h(SvgIcon,{className:classes(['deleteIcon'],custom),onClick:erase},h('path',{d:cancelPath}))):null;
 return h(RootSlot,rootProps,visual,h(LabelSlot,labelOptions,label),deletion);
});
Chip.displayName='Chip';
module.exports={Chip,chipClasses,getChipUtilityClass:utility};
