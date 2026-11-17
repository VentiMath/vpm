'use strict';
const React=require('react'),{styled,useThemeProps}=require('./theme.cjs'),{alpha,lighten,darken}=require('vmui-system');
const h=React.createElement,empty=Object.freeze({}),TableContext=React.createContext(null),SectionContext=React.createContext(null);
const cap=s=>s[0].toUpperCase()+s.slice(1),join=(...a)=>a.filter(Boolean).join(' ');
const utility=(name,slot)=>slot==='selected'?'Mui-selected':'Mui'+name+'-'+slot;
const classes=(name,slots,custom)=>{let text='';for(let i=0;i<slots.length;i++){const slot=slots[i];if(!slot)continue;if(text)text+=' ';text+=utility(name,slot);if(Object.hasOwn(custom,slot)&&custom[slot])text+=' '+custom[slot];}return text;};
// Cache only primitive color computations. Theme objects/overrides stay live,
// including in-place palette changes and CSS-variable themes.
const colors=new Map();
function cachedColor(key,compute){if(colors.has(key))return colors.get(key);const value=compute();if(colors.size===128)colors.delete(colors.keys().next().value);colors.set(key,value);return value;}

const bodyText=theme=>theme.typography.body2||{fontFamily:theme.typography.fontFamily,fontWeight:theme.typography.fontWeightRegular,fontSize:'0.875rem',lineHeight:1.43,letterSpacing:'0.01071em'};
const tint=(c,a)=>/var\(|calc\(/.test(c+String(a))?`rgb(from ${c} r g b / ${a})`:cachedColor('alpha:'+c+':'+a,()=>alpha(c,a));
const TableRoot=styled('table',{name:'MuiTable',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.stickyHeader&&o.stickyHeader]})(({theme,ownerState:s})=>({display:'table',width:'100%',borderCollapse:s.stickyHeader?'separate':'collapse',borderSpacing:0,'& caption':{...bodyText(theme),padding:16,color:(theme.vars?.palette||theme.palette).text.secondary,textAlign:'left',captionSide:'bottom'}}));
const Table=React.forwardRef(function Table(input,ref){
 const p=useThemeProps({props:input,name:'MuiTable'}),{component='table',size='medium',padding='normal',stickyHeader=false,classes:custom=empty,className,children,...rest}=p;
 const context=React.useMemo(()=>({size,padding,stickyHeader}),[size,padding,stickyHeader]);
 return h(TableContext.Provider,{value:context},h(SectionContext.Provider,{value:null},h(TableRoot,{role:component==='table'?undefined:'table',...rest,as:component,ref,ownerState:{...p,...context},className:join(classes('Table',['root',stickyHeader&&'stickyHeader'],custom),className)},children)));
});
function section(name,tag,variant,display){
 const Root=styled(tag,{name:'Mui'+name,slot:'Root',overridesResolver:(_,o)=>o.root})({display});
 return React.forwardRef(function Section(input,ref){const p=useThemeProps({props:input,name:'Mui'+name}),{component=tag,classes:custom=empty,className,children,...rest}=p;return h(SectionContext.Provider,{value:variant},h(Root,{role:component===tag?undefined:'rowgroup',...rest,as:component,ref,ownerState:p,className:join(classes(name,['root'],custom),className)},children));});
}
const TableHead=section('TableHead','thead','head','table-header-group'),TableBody=section('TableBody','tbody','body','table-row-group'),TableFooter=section('TableFooter','tfoot','footer','table-footer-group');
const RowRoot=styled('tr',{name:'MuiTableRow',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.head&&o.head,s.footer&&o.footer]})(({theme})=>{
 const p=theme.vars?.palette||theme.palette,dark=theme.palette.mode==='dark',a=p.action||empty,selected=a.selectedOpacity??(dark?.16:.08),hover=a.hoverOpacity??(dark?.08:.04);
 const selection=opacity=>p.primary.mainChannel?`rgba(${p.primary.mainChannel} / ${opacity})`:tint(p.primary.main,opacity);
 const combined=typeof selected==='number'&&typeof hover==='number'?selected+hover:`calc(${selected} + ${hover})`;
 return {color:'inherit',display:'table-row',verticalAlign:'middle',outline:0,'&.MuiTableRow-hover:hover':{backgroundColor:a.hover||tint(dark?'#fff':'#000',hover)},'&.Mui-selected':{backgroundColor:selection(selected),'&:hover':{backgroundColor:selection(combined)}}};
});
const TableRow=React.forwardRef(function TableRow(input,ref){
 const p=useThemeProps({props:input,name:'MuiTableRow'}),{component='tr',hover=false,selected=false,classes:custom=empty,className,...rest}=p,section=React.useContext(SectionContext);
 const state={...p,hover,selected,head:section==='head',footer:section==='footer'};
 return h(RowRoot,{role:component==='tr'?undefined:'row',...rest,as:component,ref,ownerState:state,className:join(classes('TableRow',['root',selected&&'selected',hover&&'hover',state.head&&'head',state.footer&&'footer'],custom),className)});
});
const CellRoot=styled('td',{name:'MuiTableCell',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o[s.variant],o['size'+cap(s.size)],s.padding!=='normal'&&o['padding'+cap(s.padding)],s.align!=='inherit'&&o['align'+cap(s.align)],s.stickyHeader&&o.stickyHeader]})(({theme,ownerState:s})=>{
 const p=theme.vars?.palette||theme.palette;
 const border=p.TableCell?.border||cachedColor('border:'+theme.palette.mode+':'+theme.palette.divider,()=>(theme.palette.mode==='dark'?darken:lighten)(alpha(theme.palette.divider,1),theme.palette.mode==='dark'?.68:.88));
 const css={...bodyText(theme),display:'table-cell',verticalAlign:'inherit',borderBottom:'1px solid '+border,textAlign:'left',padding:16};
 if(s.variant==='head')Object.assign(css,{color:p.text.primary,lineHeight:'1.5rem',fontWeight:theme.typography.fontWeightMedium});
 if(s.variant==='body')css.color=p.text.primary;
 if(s.variant==='footer')Object.assign(css,{color:p.text.secondary,lineHeight:'1.3125rem',fontSize:'0.75rem'});
 if(s.size==='small')Object.assign(css,{padding:'6px 16px','&.MuiTableCell-paddingCheckbox':{width:24,padding:'0 12px 0 16px','& > *':{padding:0}}});
 if(s.padding==='checkbox')Object.assign(css,{width:48,padding:'0 0 0 4px'});
 if(s.padding==='none')css.padding=0;
 if(s.align!=='inherit')css.textAlign=s.align;
 if(s.align==='right')css.flexDirection='row-reverse';
 if(s.stickyHeader)Object.assign(css,{position:'sticky',top:0,zIndex:2,backgroundColor:p.background.default});
 return css;
});
const TableCell=React.forwardRef(function TableCell(input,ref){
 const p=useThemeProps({props:input,name:'MuiTableCell'}),table=React.useContext(TableContext),section=React.useContext(SectionContext);
 const {component=section==='head'?'th':'td',variant=section,size=table?.size||'medium',padding=table?.padding||'normal',align='inherit',sortDirection,scope:requestedScope,classes:custom=empty,className,...rest}=p;
 const scope=component==='td'?undefined:requestedScope??(section==='head'?'col':undefined),stickyHeader=variant==='head'&&!!table?.stickyHeader,state={...p,variant,size,padding,align,stickyHeader};
 return h(CellRoot,{'aria-sort':sortDirection?(sortDirection==='asc'?'ascending':'descending'):undefined,scope,...rest,as:component,ref,ownerState:state,className:join(classes('TableCell',['root',variant,stickyHeader&&'stickyHeader',align!=='inherit'&&'align'+cap(align),padding!=='normal'&&'padding'+cap(padding),'size'+cap(size)],custom),className)});
});
const ContainerRoot=styled('div',{name:'MuiTableContainer',slot:'Root',overridesResolver:(_,o)=>o.root})({width:'100%',overflowX:'auto'});
const TableContainer=React.forwardRef(function TableContainer(input,ref){const p=useThemeProps({props:input,name:'MuiTableContainer'}),{component='div',classes:custom=empty,className,...rest}=p;return h(ContainerRoot,{...rest,as:component,ref,ownerState:p,className:join(classes('TableContainer',['root'],custom),className)});});
const api={Table,TableHead,TableBody,TableFooter,TableRow,TableCell,TableContainer};
const slots={Table:['root','stickyHeader'],TableHead:['root'],TableBody:['root'],TableFooter:['root'],TableContainer:['root'],TableRow:['root','selected','hover','head','footer'],TableCell:['root','head','body','footer','sizeSmall','sizeMedium','paddingCheckbox','paddingNone','alignLeft','alignCenter','alignRight','alignJustify','stickyHeader']};
for(const [name,keys]of Object.entries(slots)){api[name].displayName=name;api['get'+name+'UtilityClass']=slot=>utility(name,slot);api[name[0].toLowerCase()+name.slice(1)+'Classes']=Object.freeze(Object.fromEntries(keys.map(slot=>[slot,utility(name,slot)])));}
module.exports=api;
