"use strict";
const React=require('react'),{styled,useThemeProps}=require('./theme.cjs'),{ButtonBase}=require('./buttons.cjs'),Context=require('./accordion-context.cjs');
const h=React.createElement,empty=Object.freeze({}),join=(...x)=>x.filter(Boolean).join(' ');
const utility=(name,slot)=>['expanded','disabled','focusVisible'].includes(slot)?'Mui-'+slot:'Mui'+name+'-'+slot;
const classes=(name,slots,custom)=>slots.filter(Boolean).map(k=>join(utility(name,k),custom?.[k])).join(' ');
function defaults(input,name){const p=useThemeProps({props:input,name}),out={};for(const k of Object.keys(p))if(p[k]!==undefined)out[k]=p[k];return out;}
const transition=(theme,properties)=>theme.transitions?.create?.(properties,{duration:theme.transitions.duration.shortest})||[].concat(properties).map(p=>p+' 150ms cubic-bezier(0.4, 0, 0.2, 1) 0ms').join(',');
const SummaryRoot=styled(ButtonBase,{name:'MuiAccordionSummary',slot:'Root',overridesResolver:(_,o)=>o.root})(({theme,ownerState:s})=>{const palette=theme.vars?.palette||theme.palette;return {display:'flex',width:'100%',minHeight:48,padding:theme.spacing(0,2),transition:transition(theme,['min-height','background-color']),'&.Mui-focusVisible':{backgroundColor:palette.action?.focus||'rgba(0, 0, 0, 0.12)'},'&.Mui-disabled':{opacity:palette.action?.disabledOpacity??.38},'&:hover:not(.Mui-disabled)':{cursor:'pointer'},...(!s.disableGutters?{'&.Mui-expanded':{minHeight:64}}:{})}});
const SummaryContent=styled('span',{name:'MuiAccordionSummary',slot:'Content',overridesResolver:(_,o)=>o.content})(({theme,ownerState:s})=>({display:'flex',textAlign:'start',flexGrow:1,margin:'12px 0',...(!s.disableGutters?{transition:transition(theme,'margin'),'&.Mui-expanded':{margin:'20px 0'}}:{})}));
const SummaryIcon=styled('span',{name:'MuiAccordionSummary',slot:'ExpandIconWrapper',overridesResolver:(_,o)=>o.expandIconWrapper})(({theme})=>({display:'flex',color:(theme.vars?.palette||theme.palette).action?.active||'rgba(0, 0, 0, 0.54)',transform:'rotate(0deg)',transition:transition(theme,'transform'),'&.Mui-expanded':{transform:'rotate(180deg)'}}));
const resolve=(v,s)=>(typeof v==='function'?v(s):v)||empty;
function useRefs(a,b){return React.useMemo(()=>node=>{const refs=[a,b],cleanups=refs.map(r=>typeof r==='function'?r(node):r&&(r.current=node));return()=>refs.forEach((r,i)=>{if(typeof cleanups[i]==='function')cleanups[i]();else if(typeof r==='function')r(null);else if(r)r.current=null;});},[a,b]);}
const AccordionSummary=React.forwardRef(function AccordionSummary(input,forwardedRef){
 const p=defaults(input,'MuiAccordionSummary'),{children,classes:custom,className,expandIcon,focusVisibleClassName,onClick,slots=empty,slotProps=empty,...rest}=p;
 const {disabled=false,disableGutters,expanded,toggle}=React.useContext(Context),state={...p,disabled,disableGutters,expanded};
 const root=resolve(slotProps.root,state),content=resolve(slotProps.content,state),icon=resolve(slotProps.expandIconWrapper,state),ref=useRefs(forwardedRef,root.ref);
 const Root=slots.root||SummaryRoot,Content=slots.content||SummaryContent,Icon=slots.expandIconWrapper||SummaryIcon;
 const activate=event=>{toggle?.(event);onClick?.(event)};
 const rootProps={focusRipple:false,disableRipple:true,disabled,'aria-expanded':expanded,...rest,...root,ref,onClick:root.onClick?event=>{root.onClick(event);activate(event)}:activate,focusVisibleClassName:join(custom?.focusVisible,focusVisibleClassName),className:join(classes('AccordionSummary',['root',expanded&&'expanded',disabled&&'disabled',!disableGutters&&'gutters'],custom),className,root.className),style:{...rest.style,...root.style}};
 for(const key of Object.keys(root))if(key!=='onClick'&&/^on[A-Z]/.test(key)&&typeof root[key]==='function'&&typeof rest[key]==='function')rootProps[key]=(...args)=>{root[key](...args);rest[key](...args)};
 const contentProps={...content,className:join(classes('AccordionSummary',['content',expanded&&'expanded'],custom),content.className)};
 const iconProps={...icon,className:join(classes('AccordionSummary',['expandIconWrapper',expanded&&'expanded'],custom),icon.className)};
 for(const [Component,props]of [[Root,rootProps],[Content,contentProps],[Icon,iconProps]])if(typeof Component!=='string')props.ownerState=state;
 return h(Root,rootProps,h(Content,contentProps,children),expandIcon&&h(Icon,iconProps,expandIcon));
});
const DetailsRoot=styled('div',{name:'MuiAccordionDetails',slot:'Root',overridesResolver:(_,o)=>o.root})(({theme})=>({padding:theme.spacing(1,2,2)}));
const AccordionDetails=React.forwardRef(function AccordionDetails(input,ref){const p=defaults(input,'MuiAccordionDetails'),{children,classes:custom,className,...rest}=p;return h(DetailsRoot,{...rest,ref,ownerState:p,className:join(classes('AccordionDetails',['root'],custom),className)},children)});
const api={AccordionSummary,AccordionDetails};
for(const [name,keys]of Object.entries({AccordionSummary:['root','expanded','focusVisible','disabled','gutters','content','expandIconWrapper'],AccordionDetails:['root']})){api[name].displayName=name;api['get'+name+'UtilityClass']=slot=>utility(name,slot);api[name[0].toLowerCase()+name.slice(1)+'Classes']=Object.freeze(Object.fromEntries(keys.map(k=>[k,utility(name,k)])));}
module.exports=api;
