'use strict';
const React=require('react');
const {styled,useThemeProps}=require('./theme.cjs');
const {ButtonBase}=require('./buttons.cjs');
const {SvgIcon,Typography}=require('./text.cjs');
const {useFormControl}=require('./forms.cjs');
const h=React.createElement,empty=Object.freeze({}),join=(...xs)=>xs.filter(Boolean).join(' '),upper=s=>s[0].toUpperCase()+s.slice(1),resolve=(p,s)=>typeof p==='function'?p(s):p||empty;
const layout=typeof window==='undefined'?React.useEffect:React.useLayoutEffect;
function useRefs(...refs){return React.useMemo(()=>node=>{const clean=refs.map(ref=>typeof ref==='function'?ref(node):ref&&(ref.current=node));return()=>refs.forEach((ref,i)=>{if(typeof clean[i]==='function')clean[i]();else if(typeof ref==='function')ref(null);else if(ref)ref.current=null;});},refs);}
const utility=(name,s)=>['checked','disabled','error','required'].includes(s)?'Mui-'+s:'Mui'+name+'-'+s;
const classes=(name,slots,custom)=>join(...slots.filter(Boolean).map(s=>join(utility(name,s),Object.hasOwn(custom,s)&&custom[s])));
// Material glyph geometry is design data observed through the public SVG output;
// state, event ownership and component rendering below are independent.
const paths={blank:'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',checked:'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',mixed:'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z'};
const icons=Object.fromEntries(Object.entries(paths).map(([key,d])=>[key,h(SvgIcon,null,h('path',{d}))]));
// Only the native input is interactive. Reuse ButtonBase's ripple/focus lifetime
// without exposing a second button role or tab stop around that input.
const Frame=React.forwardRef(function Frame({role,tabIndex,'aria-disabled':ariaDisabled,disabled,type,controlComponent='span',rootAttributes,...p},ref){return h(controlComponent,{...p,...rootAttributes,ref});});
const Root=styled(ButtonBase,{name:'MuiCheckbox',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o['color'+upper(s.color)],o['size'+upper(s.size)],s.indeterminate&&o.indeterminate]})(({theme,ownerState:s})=>{
 const p=theme.vars?.palette||theme.palette,c=Object.hasOwn(p,s.color)?p[s.color]:null;
 const hover=c?.main||(theme.palette.mode==='dark'?'#fff':'#000');
 return {padding:9,borderRadius:'50%',color:p.text.secondary,...(s.edge==='start'?{marginLeft:-12}:s.edge==='end'?{marginRight:-12}:{}),...(!s.disableRipple?{'&:hover':{backgroundColor:`rgb(from ${hover} r g b / ${p.action.hoverOpacity})`},'@media (hover: none)':{'&:hover':{backgroundColor:'transparent'}}}:{}),...(c?{'&.Mui-checked, &.MuiCheckbox-indeterminate':{color:c.main},'&.Mui-disabled':{color:p.action.disabled}}:{})};
});
const Native=styled('input',{name:'PrivateSwitchBase',slot:'Input'})({cursor:'inherit',position:'absolute',opacity:0,width:'100%',height:'100%',top:0,left:0,margin:0,padding:0,zIndex:1});
const Checkbox=React.forwardRef(function Checkbox(input,ref){
 const p=useThemeProps({props:input,name:'MuiCheckbox'}),context=useFormControl();
 const {checked:given,defaultChecked,checkedIcon=icons.checked,icon=icons.blank,indeterminateIcon=icons.mixed,indeterminate=false,color='primary',size='medium',disabled:ownDisabled,required=false,readOnly=false,name,value,id,autoFocus,tabIndex,inputRef,inputProps=empty,classes:custom=empty,className,slots=empty,slotProps=empty,onChange,onFocus,onBlur,disableRipple=false,disableFocusRipple=false,edge=false,component='span',...rest}=p;
 const disabled=ownDisabled??context?.disabled??false,controlled=React.useRef(given!==undefined).current,[local,setLocal]=React.useState(Boolean(defaultChecked)),checked=controlled?given:local;
 const state={...p,checked,disabled,indeterminate,color,size,edge,disableRipple,required},field=resolve(slotProps.input??inputProps,state),root=resolve(slotProps.root,state),node=React.useRef(null);
 const mixedRef=React.useCallback(el=>{node.current=el;if(el)el.indeterminate=indeterminate;},[indeterminate]);
 const fieldRef=useRefs(mixedRef,inputRef,field.ref),rootRef=useRefs(ref,root.ref);
 // A native reset changes checked without dispatching change. Keep the icon in
 // sync after the browser's reset default action; canceled resets do nothing.
 // Reassign the public property so React observes the restored native value
 // before the next click; no React-internal tracker is accessed.
 layout(()=>{const el=node.current,form=el?.form;if(!form||controlled)return;let mounted=true;const reset=event=>queueMicrotask(()=>{if(mounted&&!event.defaultPrevented){const restored=el.checked;el.checked=restored;setLocal(restored)}});form.addEventListener('reset',reset);return()=>{mounted=false;form.removeEventListener('reset',reset);};});
 const change=event=>{field.onChange?.(event);if(event.nativeEvent?.defaultPrevented)return;const next=event.target.checked;if(!controlled)setLocal(next);onChange?.(event,next);};
 const selected=indeterminate?indeterminateIcon:checked?checkedIcon:icon;
 const visual=React.isValidElement(selected)?React.cloneElement(selected,{fontSize:selected.props.fontSize??size}):selected;
 const Input=slots.input||Native,RootSlot=slots.root||Root;
 const inputOptions={autoFocus,checked:given,defaultChecked,disabled,id,name,readOnly,required,tabIndex,type:'checkbox',value,'data-indeterminate':indeterminate,...field,ref:fieldRef,onChange:change,className:join('PrivateSwitchBase-input',field.className)};
 if(typeof Input!=='string')inputOptions.ownerState={...state,...field.ownerState};else delete inputOptions.ownerState;
 const rootOptions={...rest,...root,ref:rootRef,disabled,disableRipple,focusRipple:!disableFocusRipple,centerRipple:true,component:Frame,controlComponent:component,nativeButton:false,rootAttributes:{role:rest.role,...(rest['aria-disabled']===undefined?{}:{'aria-disabled':rest['aria-disabled']})},className:join('PrivateSwitchBase-root',edge&&'PrivateSwitchBase-edge'+upper(edge),classes('Checkbox',['root',checked&&'checked',disabled&&'disabled',indeterminate&&'indeterminate','color'+upper(color),'size'+upper(size)],custom),className,root.className),onFocus:event=>{onFocus?.(event);context?.onFocus?.(event);root.onFocus?.(event);},onBlur:event=>{onBlur?.(event);context?.onBlur?.(event);root.onBlur?.(event);}};
 if(typeof RootSlot!=='string')rootOptions.ownerState=state;
 else for(const key of ['disabled','disableRipple','focusRipple','centerRipple','component','controlComponent','nativeButton','rootAttributes'])delete rootOptions[key];
 return h(RootSlot,rootOptions,h(Input,inputOptions),visual);
});
const LabelRoot=styled('label',{name:'MuiFormControlLabel',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,{'& .MuiFormControlLabel-label':o.label},o['labelPlacement'+upper(s.labelPlacement)]]})(({theme,ownerState:s})=>({display:'inline-flex',alignItems:'center',cursor:'pointer',verticalAlign:'middle',WebkitTapHighlightColor:'transparent',marginLeft:-11,marginRight:16,'&.Mui-disabled':{cursor:'default'},'& .MuiFormControlLabel-label.Mui-disabled':{color:(theme.vars?.palette||theme.palette).text.disabled},...(s.labelPlacement==='start'?{flexDirection:'row-reverse',marginLeft:16,marginRight:-11}:s.labelPlacement==='top'?{flexDirection:'column-reverse',marginLeft:16}:s.labelPlacement==='bottom'?{flexDirection:'column',marginLeft:16}:{})}));
const Asterisk=styled('span',{name:'MuiFormControlLabel',slot:'Asterisk',overridesResolver:(_,o)=>o.asterisk})(({theme})=>({'&.Mui-error':{color:(theme.vars?.palette||theme.palette).error.main}}));
const FormControlLabel=React.forwardRef(function FormControlLabel(input,ref){
 const p=useThemeProps({props:input,name:'MuiFormControlLabel'}),context=useFormControl();
 const {control,label,labelPlacement='end',disableTypography=false,disabled:ownDisabled,required:ownRequired,checked,name,value,onChange,inputRef,classes:custom=empty,className,slots=empty,slotProps=empty,componentsProps,...rest}=p;
 const disabled=ownDisabled??control.props.disabled??context?.disabled,required=ownRequired??control.props.required,error=context?.error;
 const state={...p,disabled,required,error,labelPlacement};
 const overrides={disabled,required};for(const key of ['checked','name','value','onChange','inputRef'])if(control.props[key]===undefined&&p[key]!==undefined)overrides[key]=p[key];
 let caption=label;
 if(!disableTypography&&!(React.isValidElement(label)&&label.type===Typography)){
  const slot=resolve(slotProps.typography??componentsProps?.typography,state),Type=slots.typography||Typography;
  caption=h(Type,{...(typeof Type!=='string'?{component:'span'}:{}),...slot,...(typeof Type!=='string'?{ownerState:state}:{}),className:join(classes('FormControlLabel',['label',disabled&&'disabled'],custom),slot.className)},label);
 }
 return h(LabelRoot,{...rest,ref,ownerState:state,className:join(classes('FormControlLabel',['root',disabled&&'disabled','labelPlacement'+upper(labelPlacement),error&&'error',required&&'required'],custom),className)},React.cloneElement(control,overrides),required?h('div',null,caption,h(Asterisk,{'aria-hidden':true,ownerState:state,className:classes('FormControlLabel',['asterisk',error&&'error'],custom)},'\u2009*')):caption);
});
Checkbox.displayName='Checkbox';FormControlLabel.displayName='FormControlLabel';
const api={Checkbox,FormControlLabel};
for(const [name,slots]of Object.entries({Checkbox:['root','checked','disabled','indeterminate','colorPrimary','colorSecondary','sizeSmall','sizeMedium'],FormControlLabel:['root','labelPlacementEnd','labelPlacementStart','labelPlacementTop','labelPlacementBottom','disabled','label','error','required','asterisk']})){
 api['get'+name+'UtilityClass']=s=>utility(name,s);api[name[0].toLowerCase()+name.slice(1)+'Classes']=Object.freeze(Object.fromEntries(slots.map(s=>[s,utility(name,s)])));
}
module.exports=api;
