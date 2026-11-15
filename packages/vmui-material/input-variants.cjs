"use strict";
const React=require('react');
const {styled,useThemeProps}=require('./theme.cjs');
const {InputBase,InputBaseRoot,InputBaseInput}=require('./input-base.cjs');
const {useFormControl}=require('./forms.cjs');
const h=React.createElement,empty=Object.freeze({});
const join=(...values)=>values.filter(Boolean).join(' ');
const get=(o,k)=>Object.hasOwn(o||empty,k)?o[k]:undefined;
const palette=theme=>theme.vars?.palette||theme.palette;
const outlineColor=theme=>theme.palette.mode==='dark'?'rgba(255, 255, 255, 0.23)':'rgba(0, 0, 0, 0.23)';
const rootOverrides=({ownerState:s},o)=>[o.root,s.formControl&&o.formControl,s.startAdornment&&o.adornedStart,s.endAdornment&&o.adornedEnd,s.size==='small'&&o.sizeSmall,s.multiline&&o.multiline];
const fieldOverrides=({ownerState:s},o)=>[o.input,s.size==='small'&&o.inputSizeSmall,s.multiline&&o.inputMultiline,s.startAdornment&&o.inputAdornedStart,s.endAdornment&&o.inputAdornedEnd,s.type==='search'&&o.inputTypeSearch];
const InputRoot=styled(InputBaseRoot,{name:'MuiInput',slot:'Root',overridesResolver:(p,o)=>[rootOverrides(p,o),!p.ownerState.disableUnderline&&o.underline]})(({theme,ownerState:s})=>{
 const p=palette(theme),line=theme.palette.mode==='dark'?'rgba(255, 255, 255, 0.7)':'rgba(0, 0, 0, 0.42)';
 const rules={position:'relative',...(s.formControl?{'label + &':{marginTop:16}}:{})};
 if(s.disableUnderline)return rules;
 const position={left:0,right:0,bottom:0,content:'""',position:'absolute',pointerEvents:'none'};
 return {...rules,'&::before':{...position,borderBottom:'1px solid '+line,transition:theme.transitions?.create?.('border-bottom-color',{duration:theme.transitions.duration.shorter})||'border-bottom-color 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms'},'&::after':{...position,borderBottom:'2px solid '+(get(p,s.color)?.main||'currentColor'),transform:'scaleX(0)',transition:theme.transitions?.create?.('transform',{duration:theme.transitions.duration.shorter,easing:theme.transitions.easing.easeOut})||'transform 200ms cubic-bezier(0.0, 0, 0.2, 1) 0ms'},'&.Mui-focused:after':{transform:'scaleX(1) translateX(0)'},'&:hover:not(.Mui-disabled, .Mui-error):before':{borderBottom:'2px solid '+p.text.primary,'@media (hover: none)':{borderBottom:'1px solid '+line}},'&.Mui-disabled:before':{borderBottomStyle:'dotted'},'&.Mui-error::before, &.Mui-error::after':{borderBottomColor:p.error.main}};
});
const InputField=styled(InputBaseInput,{name:'MuiInput',slot:'Input',overridesResolver:fieldOverrides})({});
const OutlinedRoot=styled(InputBaseRoot,{name:'MuiOutlinedInput',slot:'Root',overridesResolver:rootOverrides})(({theme,ownerState:s})=>{
 const p=palette(theme),outline=' .MuiOutlinedInput-notchedOutline';
 return {position:'relative',borderRadius:(theme.vars?.shape||theme.shape).borderRadius,
 ['&:hover'+outline]:{borderColor:p.text.primary,'@media (hover: none)':{borderColor:outlineColor(theme)}},
 ['&.Mui-focused'+outline]:{borderWidth:2,borderColor:get(p,s.color)?.main},['&.Mui-error'+outline]:{borderColor:p.error.main},['&.Mui-disabled'+outline]:{borderColor:p.action.disabled},
 ...(s.startAdornment?{paddingLeft:14}:{}),...(s.endAdornment?{'--_trailingPad':'14px',paddingRight:'var(--_trailingPad)','&.MuiSelect-root':{'--_trailingPad':'0px'}}:{}),
 ...(s.multiline?{padding:s.size==='small'?'8.5px 14px':'16.5px 14px'}:{})};
});
const OutlinedField=styled(InputBaseInput,{name:'MuiOutlinedInput',slot:'Input',overridesResolver:fieldOverrides})(({theme,ownerState:s})=>({
 padding:s.size==='small'?'8.5px 14px':'16.5px 14px',
 '&:-webkit-autofill':{borderRadius:'inherit',...(theme.palette.mode==='dark'?{WebkitBoxShadow:'0 0 0 100px #266798 inset',WebkitTextFillColor:'#fff',caretColor:'#fff'}:{})},
 ...(s.multiline?{padding:0}:{}),...(s.startAdornment?{paddingLeft:0}:{}),...(s.endAdornment?{paddingRight:0}:{})
}));
const Outline=styled('fieldset',{name:'MuiOutlinedInput',slot:'NotchedOutline',overridesResolver:(_,o)=>o.notchedOutline})(
 'text-align:left;position:absolute;bottom:0;right:0;top:-5px;left:0;margin:0;padding:0 8px;pointer-events:none;border-radius:inherit;border-style:solid;border-width:1px;overflow:hidden;min-width:0%;',
 ({theme})=>({borderColor:outlineColor(theme)})
);
const Legend=styled('legend',{skipSx:true})('float:unset;overflow:hidden;display:block;padding:0;height:11px;',({ownerState:s})=>s.hasLabel?{
 width:'auto',fontSize:'0.75em',visibility:'hidden',maxWidth:s.notched?'100%':'0.01px',transition:s.notched?'max-width 100ms cubic-bezier(0.0, 0, 0.2, 1) 50ms':'max-width 50ms cubic-bezier(0.0, 0, 0.2, 1) 0ms',whiteSpace:'nowrap','& > span':{paddingLeft:5,paddingRight:5,display:'inline-block',opacity:0,visibility:'visible'}
 }:{transition:'width 150ms cubic-bezier(0.0, 0, 0.2, 1) 0ms'});
function legend(label,notched){const hasLabel=label!=null&&label!=='';return h(Legend,{ownerState:{hasLabel,notched}},hasLabel?h('span',null,label):h('span',{className:'notranslate','aria-hidden':true},'\u200b'));}
const NotchedOutline=React.forwardRef(function NotchedOutline({label,notched,ownerState,...props},ref){return h(Outline,{...props,ref,ownerState},legend(label,notched));});
function makeInput(name,outlined){
 const Component=React.forwardRef(function MaterialInput(input,ref){
  const p=useThemeProps({props:input,name:'Mui'+name}),context=useFormControl();
  const {classes:custom=empty,slots=empty,slotProps=empty,components=empty,componentsProps=empty,disableUnderline=false,label,notched,...rest}=p;
  const state={...p};for(const key of ['color','disabled','error','required','size','hiddenLabel'])if(state[key]===undefined)state[key]=context?.[key];
  const rootSlot=slotProps.root||componentsProps.root||empty,inputSlot=slotProps.input||componentsProps.input||empty;
  const resolvedSlots={root:slots.root||components.Root||(outlined?OutlinedRoot:InputRoot),input:slots.input||components.Input||(outlined?OutlinedField:InputField)};
  const baseClasses={...custom,root:join('Mui'+name+'-root',!outlined&&!disableUnderline&&'MuiInput-underline',!outlined&&!disableUnderline&&get(custom,'underline'),get(custom,'root')),input:join('Mui'+name+'-input',get(custom,'input'))};
  const baseProps={...rest,ref,classes:baseClasses,slots:resolvedSlots,slotProps:{root:{...rootSlot,ownerState:{disableUnderline,...rootSlot.ownerState}},input:inputSlot}};
  if(outlined)baseProps.renderSuffix=s=>{
   const open=notched===undefined?Boolean(s.startAdornment||s.filled||s.focused):notched;
   const text=label!=null&&label!==''&&state.required?h(React.Fragment,null,label,'\u2009','*'):label;
   const extra=typeof slotProps.notchedOutline==='function'?slotProps.notchedOutline(state):slotProps.notchedOutline||empty;
   const Slot=slots.notchedOutline||NotchedOutline;
   const opts={'aria-hidden':true,...extra,className:join('MuiOutlinedInput-notchedOutline',get(custom,'notchedOutline'),extra.className)};
   if(typeof Slot==='string')return h(Slot,opts,legend(text,open));
   return h(Slot,{...opts,label:text,notched:open,ownerState:{...state,...extra.ownerState}});
  };
  return h(InputBase,baseProps);
 });
 Component.displayName=name;Component.muiName='Input';return Component;
}
const Input=makeInput('Input',false),OutlinedInput=makeInput('OutlinedInput',true),api={Input,OutlinedInput};
for(const name of ['Input','OutlinedInput']){
 const utility=slot=>['focused','disabled','error'].includes(slot)?'Mui-'+slot:'Mui'+name+'-'+slot;
 const slots=['root','colorSecondary','focused','disabled','adornedStart','adornedEnd','error','sizeSmall','multiline','input','inputTypeSearch',name==='Input'?'underline':'notchedOutline'];
 api['get'+name+'UtilityClass']=utility;api[name[0].toLowerCase()+name.slice(1)+'Classes']=Object.freeze(Object.fromEntries(slots.map(slot=>[slot,utility(slot)])));
}
module.exports=api;
