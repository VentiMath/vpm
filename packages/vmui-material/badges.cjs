'use strict';
const React=require('react'),{styled,useThemeProps}=require('./theme.cjs');
const h=React.createElement,empty=Object.freeze({}),cap=s=>s[0].toUpperCase()+s.slice(1),join=(...s)=>s.filter(Boolean).join(' ');
const utility=slot=>slot==='invisible'?'MuiBadge-invisible':'MuiBadge-'+slot;
const origins=['TopRight','BottomRight','TopLeft','BottomLeft'];
const keys=['root','badge','dot','standard',...origins.map(s=>'anchorOrigin'+s),'invisible',...['Primary','Secondary','Error','Info','Success','Warning'].map(s=>'color'+s),...['Rectangular','Circular'].flatMap(shape=>origins.map(s=>'anchorOrigin'+s+shape)),'overlapRectangular','overlapCircular'];
const badgeClasses=Object.freeze(Object.fromEntries(keys.map(k=>[k,utility(k)])));
const own=(o,k)=>o&&Object.hasOwn(o,k)?o[k]:undefined;
const classes=(slots,custom)=>slots.filter(Boolean).map(k=>join(utility(k),own(custom,k))).join(' ');
const BadgeRoot=styled('span',{name:'MuiBadge',slot:'Root',overridesResolver:(_,o)=>o.root})({position:'relative',display:'inline-flex',verticalAlign:'middle',flexShrink:0});
const BadgeMark=styled('span',{name:'MuiBadge',slot:'Badge',overridesResolver:({ownerState:s},o)=>{const anchor='anchorOrigin'+cap(s.anchorOrigin.vertical)+cap(s.anchorOrigin.horizontal);return [o.badge,o[s.variant],o[anchor],o[anchor+cap(s.overlap)],o['overlap'+cap(s.overlap)],s.color!=='default'&&o['color'+cap(s.color)],s.invisible&&o.invisible]}})(({theme,ownerState:s})=>{
 const palette=theme.vars?.palette||theme.palette,color=own(palette,s.color),dot=s.variant==='dot';
 const duration=theme.transitions?.duration||{},transition=ms=>theme.transitions?.create?.('transform',{duration:ms})||`transform ${ms}ms cubic-bezier(0.4, 0, 0.2, 1) 0ms`;
 return {display:'flex',flexDirection:'row',flexWrap:'wrap',justifyContent:'center',alignContent:'center',alignItems:'center',position:'absolute',boxSizing:'border-box',fontFamily:theme.typography.fontFamily,fontWeight:theme.typography.fontWeightMedium,fontSize:theme.typography.pxToRem?.(12)||'.75rem',minWidth:dot?8:20,lineHeight:1,padding:dot?0:'0 6px',height:dot?8:20,borderRadius:dot?4:10,zIndex:1,transition:transition(duration.enteringScreen??225),...(color?.main?{backgroundColor:color.main,color:color.contrastText||'#fff'}:{}),inset:'var(--Badge-inset)',transform:'scale(1) translate(var(--Badge-translate))',transformOrigin:'var(--Badge-origin)','@media (forced-colors: active)':{border:'1px solid ButtonBorder'},'&.MuiBadge-invisible':{transform:'scale(0) translate(var(--Badge-translate))',transition:transition(duration.leavingScreen??195)},'@media (prefers-reduced-motion: reduce)':{transition:'none','&.MuiBadge-invisible':{transition:'none'}}};
});
const resolve=(v,s)=>(typeof v==='function'?v(s):v)||empty;
function useRefs(a,b){return React.useMemo(()=>node=>{const rs=[a,b],clean=rs.map(r=>typeof r==='function'?r(node):r&&(r.current=node));return()=>rs.forEach((r,i)=>{if(typeof clean[i]==='function')clean[i]();else if(typeof r==='function')r(null);else if(r)r.current=null;});},[a,b]);}
const Badge=React.forwardRef(function Badge(input,forwardedRef){
 const p=useThemeProps({props:input,name:'MuiBadge'});
 const {children,badgeContent,anchorOrigin=empty,color='default',component,overlap='rectangular',variant='standard',invisible:hide=false,max=99,showZero=false,classes:custom=empty,className,slots=empty,slotProps=empty,...rest}=p;
 const invisible=!!(hide||(!showZero&&badgeContent===0)||(badgeContent==null&&variant!=='dot'));
 const origin={vertical:anchorOrigin.vertical||'top',horizontal:anchorOrigin.horizontal||'right'};
 const current={badgeContent,anchorOrigin:origin,color,overlap,variant,max},last=React.useRef();
 // Only committed visible renders become the exit snapshot. Suspended or
 // abandoned renders must not change which count fades out.
 React.useLayoutEffect(()=>{if(!invisible)last.current=current});
 const visible=invisible?(last.current||{...current,badgeContent:undefined}):current;
 const displayValue=visible.variant==='dot'?'':visible.badgeContent>visible.max?visible.max+'+':visible.badgeContent;
 const state={...p,...visible,invisible,showZero,displayValue};
 const root=resolve(slotProps.root,state),mark=resolve(slotProps.badge,state),ref=useRefs(forwardedRef,root.ref);
 const RootSlot=slots.root||BadgeRoot,MarkSlot=slots.badge||BadgeMark,vertical=visible.anchorOrigin.vertical,horizontal=visible.anchorOrigin.horizontal;
 const anchor='anchorOrigin'+cap(vertical)+cap(horizontal),distance=visible.overlap==='circular'?'14%':'0';
 const inset=[vertical==='top'?distance:'auto',horizontal==='right'?distance:'auto',vertical==='bottom'?distance:'auto',horizontal==='left'?distance:'auto'].join(' ');
 const style={'--Badge-translate':(horizontal==='right'?'50%':'-50%')+', '+(vertical==='top'?'-50%':'50%'),'--Badge-inset':inset,'--Badge-origin':(horizontal==='right'?'100%':'0%')+' '+(vertical==='top'?'0%':'100%'),...mark.style};
 const rootProps={...rest,...root,ref,className:join(classes(['root'],custom),className,root.className),style:{...rest.style,...root.style}};
 if(RootSlot===BadgeRoot)rootProps.as=component;else if(component)rootProps.component=component;
 if(typeof RootSlot!=='string')rootProps.ownerState=state;
 const markProps={'aria-hidden':true,...mark,style,className:join(classes(['badge',visible.variant,invisible&&'invisible',anchor,anchor+cap(visible.overlap),'overlap'+cap(visible.overlap),visible.color!=='default'&&'color'+cap(visible.color)],custom),mark.className)};
 if(typeof MarkSlot!=='string')markProps.ownerState=state;
 return h(RootSlot,rootProps,children,h(MarkSlot,markProps,displayValue));
});
Badge.displayName='Badge';
module.exports={Badge,badgeClasses,getBadgeUtilityClass:utility,BadgeRoot,BadgeMark};
