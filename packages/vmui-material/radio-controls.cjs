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
// Only the native input is interactive. Reuse ButtonBase's ripple/focus lifetime
// without exposing a second button role or tab stop around that input.
const Frame=React.forwardRef(function Frame({role,tabIndex,'aria-disabled':ariaDisabled,disabled,type,controlComponent='span',rootAttributes,...p},ref){return h(controlComponent,{...p,...rootAttributes,ref});});
const Root=styled(ButtonBase,{name:'MuiRadio',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o['color'+upper(s.color)],o['size'+upper(s.size)]]})(({theme,ownerState:s})=>{
 const p=theme.vars?.palette||theme.palette,c=Object.hasOwn(p,s.color)?p[s.color]:null;
 const hover=c?.main||(theme.palette.mode==='dark'?'#fff':'#000');
 return {padding:9,borderRadius:'50%',color:p.text.secondary,...(s.edge==='start'?{marginLeft:-12}:s.edge==='end'?{marginRight:-12}:{}),...(!s.disableRipple?{'&:hover':{backgroundColor:`rgb(from ${hover} r g b / ${p.action.hoverOpacity})`},'@media (hover: none)':{'&:hover':{backgroundColor:'transparent'}}}:{}),...(c?{'&.Mui-checked':{color:c.main}}:{}),'&.Mui-disabled':{color:p.action.disabled}};
});
const Native=styled('input',{name:'PrivateSwitchBase',slot:'Input'})({cursor:'inherit',position:'absolute',opacity:0,width:'100%',height:'100%',top:0,left:0,margin:0,padding:0,zIndex:1});
// Standard Material glyph geometry is observed SVG design data, not runtime code.
const ring='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z';
const dot='M8.465 8.465C9.37 7.56 10.62 7 12 7C14.76 7 17 9.24 17 12C17 13.38 16.44 14.63 15.535 15.535C14.63 16.44 13.38 17 12 17C9.24 17 7 14.76 7 12C7 10.62 7.56 9.37 8.465 8.465Z';
const IconFrame=styled('span')({position:'relative',display:'flex'});
const Ring=styled(SvgIcon)({transform:'scale(1)'});
const Dot=styled(SvgIcon)(({theme,ownerState:s})=>({left:0,position:'absolute',transform:s.checked?'scale(1)':'scale(0)',transition:theme.transitions?.create('transform',{duration:theme.transitions.duration.shortest,easing:s.checked?theme.transitions.easing.easeOut:theme.transitions.easing.easeIn})||`transform 150ms ${s.checked?'cubic-bezier(0, 0, 0.2, 1)':'cubic-bezier(0.4, 0, 1, 1)'} 0ms`}));
function RadioIcon({checked,size}){return h(IconFrame,null,h(Ring,{fontSize:size,'data-testid':process.env.NODE_ENV==='production'?undefined:'RadioButtonUncheckedIcon'},h('path',{d:ring})),h(Dot,{fontSize:size,ownerState:{checked},'data-testid':process.env.NODE_ENV==='production'?undefined:'RadioButtonCheckedIcon'},h('path',{d:dot})));}
const RadioGroupContext=React.createContext(undefined);
const useRadioGroup=()=>React.useContext(RadioGroupContext);
const equal=(a,b)=>typeof b==='object'&&b!==null?a===b:String(a)===String(b);
const Radio=React.forwardRef(function Radio(input,ref){
 const p=useThemeProps({props:input,name:'MuiRadio'}),context=useFormControl(),group=useRadioGroup();
 const {checked:ownChecked,defaultChecked,checkedIcon,icon,color='primary',size='medium',disabled:ownDisabled,required=false,readOnly=false,name:ownName,value,id,autoFocus,tabIndex,inputRef,inputProps=empty,classes:custom=empty,className,slots=empty,slotProps=empty,onChange,onFocus,onBlur,disableRipple=false,disableFocusRipple=false,edge=false,component='span',...rest}=p;
 const given=ownChecked===undefined&&group?equal(group.value,value):ownChecked,name=ownName??group?.name;
 const disabled=ownDisabled??context?.disabled??false,controlled=React.useRef(given!==undefined).current,[local,setLocal]=React.useState(Boolean(defaultChecked)),checked=controlled?given:local;
 const state={...p,checked,disabled,color,size,edge,disableRipple,required},field=resolve(slotProps.input??inputProps,state),root=resolve(slotProps.root,state),node=React.useRef(null);
 const fieldRef=useRefs(node,inputRef,field.ref),rootRef=useRefs(ref,root.ref);
 // A native reset changes checked without dispatching change. Keep the icon in
 // sync after the browser's reset default action; canceled resets do nothing.
 // Reassign the public property so React observes the restored native value
 // before the next click; no React-internal tracker is accessed.
 layout(()=>{const el=node.current,form=el?.form;if(!form||controlled)return;let mounted=true;const reset=event=>queueMicrotask(()=>{if(mounted&&!event.defaultPrevented){const restored=el.checked;el.checked=restored;setLocal(restored)}});form.addEventListener('reset',reset);return()=>{mounted=false;form.removeEventListener('reset',reset);};});
 const change=event=>{field.onChange?.(event);if(event.nativeEvent?.defaultPrevented)return;const next=event.target.checked;if(!controlled)setLocal(next);onChange?.(event,next);group?.onChange(event,event.target.value);};
 const selected=checked?checkedIcon:icon;
 const visual=React.isValidElement(selected)?React.cloneElement(selected,{fontSize:selected.props.fontSize??size}):selected??h(RadioIcon,{checked:Boolean(checked),size});
 const Input=slots.input||Native,RootSlot=slots.root||Root;
 const inputOptions={autoFocus,checked:given,defaultChecked,disabled,id,name,readOnly,required,tabIndex,type:'radio',value,...field,ref:fieldRef,onChange:change,className:join('PrivateSwitchBase-input',field.className)};
 if(typeof Input!=='string')inputOptions.ownerState={...state,...field.ownerState};else delete inputOptions.ownerState;
 const rootOptions={...rest,...root,ref:rootRef,disabled,disableRipple,focusRipple:!disableFocusRipple,centerRipple:true,component:Frame,controlComponent:component,nativeButton:false,rootAttributes:{role:rest.role,...(rest['aria-disabled']===undefined?{}:{'aria-disabled':rest['aria-disabled']})},className:join('PrivateSwitchBase-root',edge&&'PrivateSwitchBase-edge'+upper(edge),classes('Radio',['root',checked&&'checked',disabled&&'disabled','color'+upper(color),size!=='medium'&&'size'+upper(size)],custom),className,root.className),onFocus:event=>{onFocus?.(event);context?.onFocus?.(event);root.onFocus?.(event);},onBlur:event=>{onBlur?.(event);context?.onBlur?.(event);root.onBlur?.(event);}};
 if(typeof RootSlot!=='string')rootOptions.ownerState=state;
 else for(const key of ['disabled','disableRipple','focusRipple','centerRipple','component','controlComponent','nativeButton','rootAttributes'])delete rootOptions[key];
 return h(RootSlot,rootOptions,h(Input,inputOptions),visual);
});

const GroupRoot=styled('div',{name:'MuiFormGroup',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,s.row&&o.row]})(({ownerState:s})=>({display:'flex',flexDirection:s.row?'row':'column',flexWrap:'wrap'}));
const FormGroup=React.forwardRef(function FormGroup(input,ref){
 const p=useThemeProps({props:input,name:'MuiFormGroup'}),context=useFormControl();
 const {row=false,error=context?.error,classes:custom=empty,className,...rest}=p;
 return h(GroupRoot,{...rest,ref,ownerState:{...p,row,error},className:join(classes('FormGroup',['root',row&&'row',error&&'error'],custom),className)});
});
const RadioGroup=React.forwardRef(function RadioGroup(input,ref){
 const {value:given,defaultValue,name:ownName,onChange,actions,children,className,classes:custom=empty,...rest}=input;
 const generated=React.useId(),name=ownName??generated,controlled=React.useRef(given!==undefined).current,[local,setLocal]=React.useState(defaultValue),value=controlled?given:local,node=React.useRef(null),rootRef=useRefs(node,ref);
 const state=React.useMemo(()=>({name,value,onChange(event,next){if(!controlled)setLocal(next);onChange?.(event,next);}}),[name,value,onChange,controlled]);
 React.useImperativeHandle(actions,()=>({focus(){const items=[...node.current.querySelectorAll('input[type="radio"]')].filter(el=>!el.disabled);(items.find(el=>el.checked)||items[0])?.focus();}}),[]);
 // Group-owned radios are controlled DOM inputs even for defaultValue. Restore
 // that initial selection after a native form reset without emitting onChange.
 layout(()=>{if(controlled)return;const form=node.current?.closest('form');if(!form)return;let live=true;const reset=e=>queueMicrotask(()=>{if(live&&!e.defaultPrevented)setLocal(defaultValue)});form.addEventListener('reset',reset);return()=>{live=false;form.removeEventListener('reset',reset)};},[controlled,defaultValue]);
 return h(RadioGroupContext.Provider,{value:state},h(FormGroup,{role:'radiogroup',...rest,ref:rootRef,className:join(classes('RadioGroup',['root',rest.row&&'row',rest.error&&'error'],custom),className)},children));
});
Radio.displayName='Radio';RadioGroup.displayName='RadioGroup';FormGroup.displayName='FormGroup';
const api={Radio,RadioGroup,FormGroup,useRadioGroup};
for(const [name,slots]of Object.entries({Radio:['root','checked','disabled','colorPrimary','colorSecondary','sizeSmall'],RadioGroup:['root','row','error'],FormGroup:['root','row','error']})){
 api['get'+name+'UtilityClass']=s=>utility(name,s);api[name[0].toLowerCase()+name.slice(1)+'Classes']=Object.freeze(Object.fromEntries(slots.map(s=>[s,utility(name,s)])));
}
module.exports=api;
Object.defineProperty(api,'RadioGroupContext',{value:RadioGroupContext});
