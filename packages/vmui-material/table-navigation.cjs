'use strict';
const React=require('react'),{styled,useTheme,useThemeProps}=require('./theme.cjs'),{ButtonBase}=require('./buttons.cjs'),{SvgIcon}=require('./text.cjs'),{alpha}=require('vmui-system');
const h=React.createElement,empty=Object.freeze({}),cap=s=>s[0].toUpperCase()+s.slice(1),join=(...v)=>v.filter(Boolean).join(' ');
const globals=new Set(['active','disabled','selected','focusVisible']);
const utility=(name,slot)=>globals.has(slot)?'Mui-'+slot:'Mui'+name+'-'+slot;
const classList=(name,slots,custom)=>slots.filter(Boolean).map(slot=>join(utility(name,slot),Object.hasOwn(custom,slot)&&custom[slot])).join(' ');
const resolve=(props,state)=>typeof props==='function'?props(state):props||empty;
function useRefs(a,b){return React.useMemo(()=>node=>{const refs=[a,b],cleanup=refs.map(r=>typeof r==='function'?r(node):r&&(r.current=node));return()=>refs.forEach((r,i)=>{if(typeof cleanup[i]==='function')cleanup[i]();else if(typeof r==='function')r(null);else if(r)r.current=null;});},[a,b]);}
const transition=(theme,names,duration)=>theme.transitions?.create?.(names,{duration:theme.transitions.duration?.[duration]})||names.map(n=>n+' '+(duration==='shorter'?200:250)+'ms cubic-bezier(0.4, 0, 0.2, 1) 0ms').join(',');
const Arrow=React.forwardRef(function Arrow(props,ref){return h(SvgIcon,{...props,ref},h('path',{d:'M11 4h2v12.2l5.6-5.6L20 12l-8 8-8-8 1.4-1.4 5.6 5.6z'}));});
const SortRoot=styled(ButtonBase,{name:'MuiTableSortLabel',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.active&&o.active,o['direction'+cap(s.direction)]]})(({theme})=>{
 const p=theme.vars?.palette||theme.palette;
 return {cursor:'pointer',display:'inline-flex',justifyContent:'flex-start',flexDirection:'inherit',alignItems:'center',
 '&:focus':{color:p.text.secondary},'&:hover':{color:p.text.secondary,'& .MuiTableSortLabel-icon':{opacity:.5}},
 '&.Mui-active':{color:p.text.primary,'& .MuiTableSortLabel-icon':{opacity:1,color:p.text.secondary}}};
});
const SortIcon=styled(Arrow,{name:'MuiTableSortLabel',slot:'Icon',overridesResolver:({ownerState:s},o)=>[o.icon,o['iconDirection'+cap(s.direction)]]})(({theme,ownerState:s})=>({fontSize:18,marginRight:4,marginLeft:4,opacity:0,transition:transition(theme,['opacity','transform'],'shorter'),userSelect:'none',transform:'rotate('+(s.direction==='asc'?180:0)+'deg)'}));
const TableSortLabel=React.forwardRef(function TableSortLabel(input,forwardedRef){
 const p=useThemeProps({props:input,name:'MuiTableSortLabel'});
 const {active=false,direction='asc',hideSortIcon=false,IconComponent=Arrow,component='span',children,className,classes=empty,slots=empty,slotProps=empty,...rest}=p;
 const state={...p,active,direction,hideSortIcon},root=resolve(slotProps.root,state),icon=resolve(slotProps.icon,state),Root=slots.root||SortRoot,ref=useRefs(forwardedRef,root.ref);
 const rootProps={component,disableRipple:true,...rest,...root,ref,className:join(classList('TableSortLabel',['root',active&&'active','direction'+cap(direction)],classes),className,root.className)};
 if(typeof Root==='string'){delete rootProps.component;delete rootProps.disableRipple;}else rootProps.ownerState=state;
 const Icon=slots.icon||SortIcon,iconProps={...icon,className:join(classList('TableSortLabel',['icon'],classes),icon.className)};
 if(typeof Icon!=='string')iconProps.ownerState=state;
 if(!slots.icon)iconProps.as=IconComponent;
 return h(Root,rootProps,children,!hideSortIcon||active?h(Icon,iconProps):null);
});

// Form the center window and edge windows separately; joining a one-page gap
// inserts that page, while a larger gap becomes an inert ellipsis. Work is
// proportional to the requested visible window, not the total page count.
function pageItems(count,page,boundary,siblings){
 const left=Math.min(boundary,count),right=Math.max(left+1,count-boundary+1);
 const start=Math.max(boundary+2,Math.min(page-siblings,count-boundary-2*siblings-1));
 const end=Math.min(count-boundary-1,Math.max(page+siblings,boundary+2*siblings+2));
 const result=[];
 for(let i=1;i<=left;i++)result.push(i);
 if(start>boundary+2)result.push('start-ellipsis');else if(boundary+1<count-boundary)result.push(boundary+1);
 for(let i=start;i<=end;i++)result.push(i);
 if(end<count-boundary-1)result.push('end-ellipsis');else if(count-boundary>boundary)result.push(count-boundary);
 for(let i=right;i<=count;i++)result.push(i);
 return result;
}
function usePagination(props={}){
 const {count=1,page:controlledPage,defaultPage=1,boundaryCount=1,siblingCount=1,disabled=false,hideNextButton=false,hidePrevButton=false,showFirstButton=false,showLastButton=false,onChange,componentName,...rest}=props;
 const controlled=React.useRef(controlledPage!==undefined).current,[value,setValue]=React.useState(defaultPage),page=controlled?controlledPage:value;
 // Fail promptly instead of an unbounded allocation for invalid window sizes.
 for(const [name,n]of Object.entries({count,boundaryCount,siblingCount}))if(!Number.isSafeInteger(n)||n<0)throw new RangeError(name+' must be a nonnegative safe integer');
 if(!Number.isSafeInteger(page))throw new RangeError('page must be a safe integer');
 const sequence=pageItems(count,page,boundaryCount,siblingCount);
 if(!hidePrevButton)sequence.unshift('previous');if(showFirstButton)sequence.unshift('first');
 if(!hideNextButton)sequence.push('next');if(showLastButton)sequence.push('last');
 const items=sequence.map(item=>{
  const type=typeof item==='number'?'page':item,target=type==='page'?item:type==='first'?1:type==='last'?count:type==='previous'?page-1:type==='next'?page+1:null;
  const selected=type==='page'&&target===page,ellipsis=type.endsWith('ellipsis');
  const unavailable=disabled||(!ellipsis&&type!=='page'&&((type==='first'||type==='previous')?page<=1:page>=count));
  return {onClick(event){if(unavailable||ellipsis)return;if(!controlled)setValue(target);if(target!==page)onChange?.(event,target);},type,page:target,selected,disabled:unavailable,...(selected?{'aria-current':'page'}:{})};
 });
 return {items,...rest};
}
function navigationIcon(name,d){const C=React.forwardRef((props,ref)=>h(SvgIcon,{...props,ref},h('path',{d})));C.displayName=name;return C;}
const Previous=navigationIcon('PreviousPage','M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z'),Next=navigationIcon('NextPage','m8.6 7.4 1.4-1.4 6 6-6 6-1.4-1.4 4.6-4.6z');
const First=navigationIcon('FirstPage','M6 6h2v12H6zm12.4 1.4L17 6l-6 6 6 6 1.4-1.4-4.6-4.6z'),Last=navigationIcon('LastPage','M16 6h2v12h-2zM5.6 7.4 7 6l6 6-6 6-1.4-1.4 4.6-4.6z');
const tint=(c,a)=>/var\(|calc\(/.test(c+String(a))?`rgb(from ${c} r g b / ${a})`:alpha(c,a);
const sum=(a,b)=>typeof a==='number'&&typeof b==='number'?a+b:`calc(${a} + ${b})`;
function itemMetrics(theme,s,ellipsis){
 const p=theme.vars?.palette||theme.palette,size=s.size,small=size==='small',large=size==='large',diameter=small?26:large?40:32;
 return {...(theme.typography.body2||{fontFamily:theme.typography.fontFamily,fontWeight:theme.typography.fontWeightRegular,fontSize:'0.875rem',lineHeight:1.43,letterSpacing:'0.01071em'}),borderRadius:s.shape==='rounded'?theme.shape.borderRadius:diameter/2,textAlign:'center',boxSizing:'border-box',minWidth:diameter,height:ellipsis?'auto':diameter,padding:'0 '+(small?4:large?10:6)+'px',margin:'0 '+(small?1:3)+'px',color:p.text.primary,...(large?{fontSize:theme.typography.pxToRem?.(15)||'0.9375rem'}:{})};
}
function itemOverrides({ownerState:s},o){return [o.root,o['size'+cap(s.size)],o[s.variant],o[s.shape],o[s.type==='page'?'page':s.type.endsWith('ellipsis')?'ellipsis':['first','last'].includes(s.type)?'firstLast':'previousNext'],s.color!=='standard'&&o['color'+cap(s.color)],s.color!=='standard'&&o[s.variant+cap(s.color)]];}
const ItemRoot=styled(ButtonBase,{name:'MuiPaginationItem',slot:'Root',overridesResolver:itemOverrides})(({theme,ownerState:s})=>{
 const p=theme.vars?.palette||theme.palette,black=p.common?.black||'#000',dark=theme.palette.mode==='dark',a={hover:tint(p.text.primary,dark?.08:.04),selected:tint(p.text.primary,dark?.16:.08),focus:tint(p.text.primary,.12),disabledOpacity:.38,disabledBackground:tint(p.text.primary,.12),activatedOpacity:dark?.24:.12,selectedOpacity:dark?.16:.08,hoverOpacity:dark?.08:.04,focusOpacity:.12,...p.action},sel=a.selectedOpacity,hover=a.hoverOpacity,focus=a.focusOpacity;
 const base={...itemMetrics(theme,s,false),transition:transition(theme,['color','background-color'],'short'),
 '&.Mui-focusVisible':{backgroundColor:a.focus},'&.Mui-disabled':{opacity:a.disabledOpacity},'&:hover':{backgroundColor:a.hover,'@media (hover: none)':{backgroundColor:'transparent'}},
 '&.Mui-selected':{backgroundColor:a.selected,'&:hover':{backgroundColor:tint(p.text.primary,sum(sel,hover)),'@media (hover: none)':{backgroundColor:a.selected}},'&.Mui-focusVisible':{backgroundColor:tint(p.text.primary,sum(sel,focus))},'&.Mui-disabled':{opacity:1,color:a.disabled,backgroundColor:a.selected}}};
 if(s.variant==='outlined'){base.border='1px solid '+(p.PaginationItem?.outlinedBorder||tint(theme.vars&&p.common?.onBackground?p.common.onBackground:dark?(p.common?.white||'#fff'):black,.23));base['&.Mui-selected']['&.Mui-disabled'].borderColor=a.disabledBackground;}
 const color=Object.hasOwn(p,s.color)&&s.color!=='standard'?p[s.color]:null;
 if(color){const selected=base['&.Mui-selected'];
  if(s.variant==='outlined')Object.assign(selected,{color:color.main,border:'1px solid '+tint(color.main,.5),backgroundColor:tint(color.main,a.activatedOpacity),'&:hover':{backgroundColor:tint(color.main,sum(a.activatedOpacity,focus)),'@media (hover: none)':{backgroundColor:'transparent'}},'&.Mui-focusVisible':{backgroundColor:tint(color.main,sum(a.activatedOpacity,focus))}});
  else Object.assign(selected,{color:color.contrastText,backgroundColor:color.main,'&:hover':{backgroundColor:color.dark,'@media (hover: none)':{backgroundColor:color.main}},'&.Mui-focusVisible':{backgroundColor:color.dark}});
 }
 return base;
});
const EllipsisRoot=styled('div',{name:'MuiPaginationItem',slot:'Root',overridesResolver:itemOverrides})(({theme,ownerState:s})=>({...itemMetrics(theme,{...s,shape:'circular'},true),'&.Mui-disabled':{opacity:(theme.vars?.palette||theme.palette).action.disabledOpacity??.38}}));
const ItemIcon=styled(SvgIcon,{name:'MuiPaginationItem',slot:'Icon',overridesResolver:(_,o)=>o.icon})(({theme,ownerState:s})=>({fontSize:theme.typography.pxToRem?.(s.size==='small'?18:s.size==='large'?22:20)||((s.size==='small'?18:s.size==='large'?22:20)/16)+'rem',margin:'0 -8px'}));
const PaginationItem=React.forwardRef(function PaginationItem(input,ref){
 const p=useThemeProps({props:input,name:'MuiPaginationItem'}),theme=useTheme();
 const {page,selected=false,disabled=false,color='standard',shape='circular',size='medium',variant='text',type='page',classes=empty,className,component,slots=empty,slotProps=empty,components=empty,children,...rest}=p;
 const state={...p,page,selected,disabled,color,shape,size,variant,type},ellipsis=type.endsWith('ellipsis');
 const classNameValue=join(classList('PaginationItem',['root','size'+cap(size),variant,shape,disabled&&'disabled',selected&&'selected',color!=='standard'&&'color'+cap(color),ellipsis?'ellipsis':type==='page'?'page':['first','last'].includes(type)?'firstLast':'previousNext'],classes),className);
 if(ellipsis)return h(EllipsisRoot,{...rest,as:component,ref,ownerState:state,className:classNameValue},'…');
 let content=page;
 if(type!=='page'){
  const physical=theme.direction==='rtl'?({previous:'next',next:'previous',first:'last',last:'first'}[type]):type;
  const defaults={previous:Previous,next:Next,first:First,last:Last},Icon=slots[physical]||components[cap(physical)]||defaults[physical],extra=resolve(slotProps[physical],state);
  content=Icon?h(ItemIcon,{...extra,as:Icon,ownerState:state,className:join(classList('PaginationItem',['icon'],classes),extra.className)}):null;
 }
 return h(ItemRoot,{...rest,component,ref,disabled,ownerState:state,className:classNameValue,focusVisibleClassName:join(classes.focusVisible,rest.focusVisibleClassName)},content);
});
const PageRoot=styled('nav',{name:'MuiPagination',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o[s.variant]]})({});
const PageList=styled('ul',{name:'MuiPagination',slot:'Ul',overridesResolver:(_,o)=>o.ul})({display:'flex',flexWrap:'wrap',alignItems:'center',padding:0,margin:0,listStyle:'none'});
const defaultLabel=(type,page,selected)=>type==='page'?(selected?'':'Go to ')+'page '+page:type.endsWith('ellipsis')?undefined:'Go to '+type+' page';
const Pagination=React.forwardRef(function Pagination(input,ref){
 const p=useThemeProps({props:input,name:'MuiPagination'});
 const {boundaryCount=1,count=1,defaultPage=1,disabled=false,hideNextButton=false,hidePrevButton=false,onChange,page,showFirstButton=false,showLastButton=false,siblingCount=1,color='standard',shape='circular',size='medium',variant='text',getItemAriaLabel=defaultLabel,renderItem=item=>h(PaginationItem,item),className,classes=empty,...rest}=p;
 const {items}=usePagination({boundaryCount,count,defaultPage,disabled,hideNextButton,hidePrevButton,onChange,page,showFirstButton,showLastButton,siblingCount});
 const state={...p,color,shape,size,variant};
 return h(PageRoot,{'aria-label':'pagination navigation',...rest,ref,ownerState:state,className:join(classList('Pagination',['root',variant],classes),className)},h(PageList,{ownerState:state,className:classList('Pagination',['ul'],classes)},items.map(item=>h('li',{key:item.type==='page'?'page-'+item.page:item.type},renderItem({color,shape,size,variant,...item,'aria-label':getItemAriaLabel(item.type,item.page,item.selected)})))));
});
const api={TableSortLabel,Pagination,PaginationItem,usePagination};
const slots={TableSortLabel:['root','active','icon','directionDesc','directionAsc'],Pagination:['root','ul','outlined','text'],PaginationItem:['root','page','sizeSmall','sizeLarge','text','outlined','rounded','ellipsis','firstLast','previousNext','focusVisible','disabled','selected','icon','colorPrimary','colorSecondary']};
for(const [name,keys]of Object.entries(slots)){api[name].displayName=name;api['get'+name+'UtilityClass']=slot=>utility(name,slot);api[name[0].toLowerCase()+name.slice(1)+'Classes']=Object.freeze(Object.fromEntries(keys.map(slot=>[slot,utility(name,slot)])));}
module.exports=api;
