'use strict';
const React=require('react');
const {styled,useThemeProps}=require('./theme.cjs');
const {FormLabel,FormControlContext,useFormControl}=require('./forms.cjs');
const {Typography}=require('./text.cjs');
const h=React.createElement,empty=Object.freeze({});
const join=(...a)=>a.filter(Boolean).join(' '),cap=s=>s[0].toUpperCase()+s.slice(1);
const utility=(name,slot)=>['disabled','error','focused','required'].includes(slot)?'Mui-'+slot:'Mui'+name+'-'+slot;
const cls=(name,slots,custom)=>join(...slots.filter(Boolean).flatMap(s=>[utility(name,s),Object.hasOwn(custom,s)&&custom[s]]));
const LabelRoot=styled(FormLabel,{name:'MuiInputLabel',slot:'Root',shouldForwardProp:p=>!['theme','sx','as','ownerState'].includes(p),overridesResolver:({ownerState:s},o)=>[o.root,s.formControl&&o.formControl,s.size==='small'&&o.sizeSmall,s.shrink&&o.shrink,!s.disableAnimation&&o.animated,o[s.variant],{'& .MuiInputLabel-asterisk':o.asterisk}]})(({theme,ownerState:s})=>{
 const small=s.size==='small',box=s.variant==='outlined'||s.variant==='filled',filled=s.variant==='filled';
 const style={display:'block',transformOrigin:'top left',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'100%'};
 if(s.formControl)Object.assign(style,{position:'absolute',left:0,top:0,transform:`translate(0, ${small?17:20}px) scale(1)`});
 else if(small)style.transform='translate(0, 17px) scale(1)';
 if(s.shrink)Object.assign(style,{transform:'translate(0, -1.5px) scale(0.75)',maxWidth:'133%'});
 if(!s.disableAnimation)style.transition=theme.transitions?.create?.(['color','transform','max-width'],{duration:theme.transitions.duration.shorter,easing:theme.transitions.easing.easeOut})||'color 200ms cubic-bezier(0.0, 0, 0.2, 1) 0ms,transform 200ms cubic-bezier(0.0, 0, 0.2, 1) 0ms,max-width 200ms cubic-bezier(0.0, 0, 0.2, 1) 0ms';
 if(box)Object.assign(style,{zIndex:1,pointerEvents:'none',transform:`translate(${filled?12:14}px, ${small?(filled?13:9):16}px) scale(1)`,maxWidth:'calc(100% - 24px)'});
 if(box&&s.shrink)Object.assign(style,{userSelect:'none',pointerEvents:'auto',transform:`translate(${filled?12:14}px, ${filled?(small?4:7):-9}px) scale(0.75)`,maxWidth:filled?'calc(133% - 24px)':'calc(133% - 32px)'});
 return style;
});
const InputLabel=React.forwardRef(function InputLabel(input,ref){
 const p=useThemeProps({props:input,name:'MuiInputLabel'}),form=useFormControl();
 const {classes:custom=empty,className,disableAnimation=false,shrink:explicit,size=p.size??form?.size,variant=p.variant??form?.variant,margin,...rest}=p;
 const shrink=explicit===undefined?(form?Boolean(form.filled||form.focused||form.adornedStart):undefined):explicit;
 const state={...p,formControl:form,disableAnimation,shrink,size,variant,focused:p.focused===undefined?form?.focused:p.focused,required:p.required===undefined?form?.required:p.required};
 const root=cls('InputLabel',['root',form&&'formControl',!disableAnimation&&'animated',shrink&&'shrink',size==='small'&&'sizeSmall',variant],custom);
 return h(LabelRoot,{...rest,ref,'data-shrink':shrink,ownerState:state,className:join(root,className),classes:{...custom,root,asterisk:cls('InputLabel',['asterisk'],custom)}});
});
const AdornmentRoot=styled('div',{name:'MuiInputAdornment',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o[s.variant],o['position'+cap(s.position)],s.disablePointerEvents&&o.disablePointerEvents,s.hiddenLabel&&o.hiddenLabel,s.size==='small'&&o.sizeSmall]})(({theme,ownerState:s})=>({
 display:'flex',maxHeight:'2em',alignItems:'center',whiteSpace:'nowrap',color:(theme.vars?.palette||theme.palette).action.active,
 ...(s.position==='start'?{marginRight:8}:{marginLeft:8}),
 ...(s.variant==='filled'?{'&.MuiInputAdornment-positionStart&:not(.MuiInputAdornment-hiddenLabel)':{marginTop:16}}:{}),
 ...(s.disablePointerEvents?{pointerEvents:'none'}:{})
}));
const InputAdornment=React.forwardRef(function InputAdornment(input,ref){
 const p=useThemeProps({props:input,name:'MuiInputAdornment'}),form=useFormControl();
 const {children,classes:custom=empty,className,component='div',disablePointerEvents=false,disableTypography=false,position,variant=p.variant??form?.variant,...rest}=p;
 const state={...p,variant,position,disablePointerEvents,hiddenLabel:form?.hiddenLabel,size:form?.size};
 const content=typeof children==='string'&&!disableTypography?h(Typography,{color:'textSecondary'},children):h(React.Fragment,null,position==='start'?h('span',{className:'notranslate','aria-hidden':true},'\u200b'):null,children);
 return h(FormControlContext.Provider,{value:null},h(AdornmentRoot,{...rest,as:component,ref,ownerState:state,className:join(cls('InputAdornment',['root','position'+cap(position),variant,disablePointerEvents&&'disablePointerEvents',state.hiddenLabel&&'hiddenLabel',state.size==='small'&&'sizeSmall'],custom),className)},content));
});
const api={InputLabel,InputAdornment};
for(const [name,slots]of Object.entries({InputLabel:['root','focused','disabled','error','required','asterisk','formControl','sizeSmall','shrink','animated','standard','filled','outlined'],InputAdornment:['root','filled','standard','outlined','positionStart','positionEnd','disablePointerEvents','hiddenLabel','sizeSmall']})){
 api[name].displayName=name;api['get'+name+'UtilityClass']=slot=>utility(name,slot);
 api[name[0].toLowerCase()+name.slice(1)+'Classes']=Object.freeze(Object.fromEntries(slots.map(s=>[s,utility(name,s)])));
}
module.exports=api;
