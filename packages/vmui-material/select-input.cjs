'use strict';
const React=require('react');
const {styled,useThemeProps}=require('./theme.cjs');
const {useFormControl}=require('./forms.cjs');
const {Input,OutlinedInput}=require('./input-variants.cjs');
const {Menu}=require('./menus.cjs');
const {SvgIcon}=require('./text.cjs');
const h=React.createElement,empty=Object.freeze({}),join=(...xs)=>xs.filter(Boolean).join(' ');
const getSelectUtilityClass=s=>['disabled','error','focused'].includes(s)?'Mui-'+s:'MuiSelect-'+s;
const selectClasses=Object.freeze(Object.fromEntries(['root','select','multiple','filled','outlined','standard','disabled','focused','icon','iconOpen','iconFilled','iconOutlined','iconStandard','nativeInput','error'].map(s=>[s,getSelectUtilityClass(s)])));
const present=v=>v!=null&&v!==''&&(!Array.isArray(v)||v.length>0);
const equal=(a,b)=>b!==null&&typeof b==='object'?a===b:String(a)===String(b);
const choose=(o,state)=>typeof o==='function'?o(state):o||empty;
const shared=({theme,ownerState:s})=>({MozAppearance:'none',WebkitAppearance:'none',userSelect:'none',borderRadius:s.variant==='outlined'?theme.shape.borderRadius:0,cursor:'pointer','&:focus':{borderRadius:s.variant==='outlined'?theme.shape.borderRadius:0},'&.Mui-disabled':{cursor:'default'},'&&&':{paddingRight:`calc(var(--_caret, ${s.variant==='outlined'?32:24}px) + var(--_endAdornment, 0px))`},'.MuiInputBase-root:has(> &)':{'--_caret':(s.variant==='outlined'?32:24)+'px','--_endAdornment':'0px'},'.MuiInputBase-root:has(> &):has(> .MuiInputAdornment-positionEnd)':{'--_endAdornment':'28px'},'& ~ .MuiInputAdornment-positionEnd':{position:'absolute',top:'50%',transform:'translateY(-50%)',right:'calc(var(--_caret, 24px) + (var(--_endAdornment, 28px) - 1.5rem) / 2)'}});
const Display=styled('div',{name:'MuiSelect',slot:'Select',overridesResolver:({ownerState:s},o)=>[o.select,o[s.variant],s.multiple&&o.multiple]}) (shared,{'&.MuiSelect-select':{height:'auto',minHeight:'1.4375em',textOverflow:'ellipsis',whiteSpace:'nowrap',overflow:'hidden'}});
const NativeDisplay=styled('select',{name:'MuiNativeSelect',slot:'Select',overridesResolver:({ownerState:s},o)=>[o.select,o[s.variant],s.multiple&&o.multiple]})(shared,({theme,ownerState:s})=>s.multiple?{height:'auto'}:{'& option, & optgroup':{background:(theme.vars?.palette||theme.palette).background.paper}});
const iconStyle=({theme,ownerState:s})=>({position:'absolute',right:s.variant==='outlined'?7:0,top:'calc(50% - .5em)',pointerEvents:'none',color:(theme.vars?.palette||theme.palette).action.active,'&.Mui-disabled':{color:(theme.vars?.palette||theme.palette).action.disabled},...(s.open?{transform:'rotate(180deg)'}:{})});
const Icon=styled('svg',{name:'MuiSelect',slot:'Icon',overridesResolver:({ownerState:s},o)=>[o.icon,s.open&&o.iconOpen]})(iconStyle);
const NativeIcon=styled('svg',{name:'MuiNativeSelect',slot:'Icon',overridesResolver:({ownerState:s},o)=>[o.icon,o['icon'+s.variant[0].toUpperCase()+s.variant.slice(1)]]})(iconStyle);
const Hidden=styled('input',{name:'MuiSelect',slot:'NativeInput',overridesResolver:(_,o)=>o.nativeInput})({bottom:0,left:0,position:'absolute',opacity:0,pointerEvents:'none',width:'100%',boxSizing:'border-box'});
const Arrow=p=>h(SvgIcon,p,h('path',{d:'M7 10l5 5 5-5z'}));
function useRefs(a,b){return React.useMemo(()=>node=>{const refs=[a,b],clean=refs.map(ref=>typeof ref==='function'?ref(node):ref&&(ref.current=node));return()=>refs.forEach((ref,i)=>{if(typeof clean[i]==='function')clean[i]();else if(typeof ref==='function')ref(null);else if(ref)ref.current=null;});},[a,b]);}
const SelectInput=React.forwardRef(function SelectInput(props,ref){
 const {value:given,defaultValue,multiple=false,displayEmpty=false,children,classes=empty,className,variant='outlined',disabled=false,readOnly=false,required=false,name,id,labelId,renderValue,IconComponent=Arrow,autoFocus,autoWidth=false,defaultOpen=false,open:givenOpen,onOpen,onClose,onChange,onFocus,onBlur,onKeyDown,MenuProps=empty,SelectDisplayProps=empty,ownerState,tabIndex,type,'aria-label':displayLabel,'aria-describedby':describedBy,'aria-invalid':invalid,...other}=props;
 const controlled=React.useRef(given!==undefined).current,[local,setLocal]=React.useState(defaultValue),value=controlled?given:local,valueRef=React.useRef(value);valueRef.current=value;
 const openControlled=React.useRef(givenOpen!==undefined).current,[localOpen,setLocalOpen]=React.useState(defaultOpen),[mounted,setMounted]=React.useState(false);
 const open=mounted&&(openControlled?!!givenOpen:localOpen),display=React.useRef(null),hidden=React.useRef(null),listId=React.useId(),hiddenId=React.useId();
 const displayRef=useRefs(display,SelectDisplayProps.ref);
 React.useImperativeHandle(ref,()=>({focus:()=>display.current?.focus(),get node(){return hidden.current},get value(){return valueRef.current}}),[]);
 React.useEffect(()=>{setMounted(true);if(autoFocus)display.current?.focus();},[]);
 React.useEffect(()=>{if(!labelId)return;const label=display.current?.ownerDocument.getElementById(labelId);const focus=()=>{if(!disabled)display.current?.focus()};label?.addEventListener('click',focus);return()=>label?.removeEventListener('click',focus);},[labelId,disabled]);
 if(multiple&&!Array.isArray(value))throw new TypeError('Select multiple requires an array value');
 const options=React.Children.toArray(children),selected=[];
 const state={...ownerState,...props,variant,disabled,multiple,open};
 const change=(event,next,child)=>{if(next===value)return;if(!controlled){valueRef.current=next;setLocal(next);}if(onChange){const native=event.nativeEvent||event,copy=new native.constructor(native.type,native);Object.defineProperty(copy,'target',{writable:true,value:{value:next,name}});onChange(copy,child);}};
 const toggle=(next,event)=>{if(next===open)return;(next?onOpen:onClose)?.(event);if(!openControlled)setLocalOpen(next);};
 const items=options.map(child=>{
  if(!React.isValidElement(child))return child;
  if(child.type===React.Fragment)throw new TypeError('Select options must be direct children, not fragments');
  if(child.type?.muiSkipListHighlight||child.props.muiSkipListHighlight)return child;
  const active=multiple?value.some(v=>equal(v,child.props.value)):equal(value,child.props.value);
  if(active)selected.push(child.props.children);
  return React.cloneElement(child,{role:'option','aria-selected':active,selected:active,value:undefined,'data-value':child.props.value,onClick:event=>{
   if(disabled||readOnly||child.props.disabled||!event.currentTarget.hasAttribute('tabindex'))return;
   child.props.onClick?.(event);let next=child.props.value;
   if(multiple){next=[...value];const i=next.indexOf(child.props.value);if(i<0)next.push(child.props.value);else next.splice(i,1);}
   change(event,next,child);if(!multiple)toggle(false,event);
  },onKeyUp:event=>{if(event.key===' ')event.preventDefault();child.props.onKeyUp?.(event);}});
 });
 let content=null;if(present(value)||displayEmpty)content=renderValue?renderValue(value):multiple?selected.flatMap((x,i)=>i?[', ',x]:[x]):selected[0];
 const blank=content==null||typeof content==='string'&&!content.trim();
 const displayId=SelectDisplayProps.id??id??(name?'mui-component-select-'+name:undefined),error=invalid??false;
 const paper=choose(MenuProps.slotProps?.paper??MenuProps.PaperProps,state),list=choose(MenuProps.slotProps?.list??MenuProps.MenuListProps,state);
 return h(React.Fragment,null,
  h(Display,{role:'combobox',tabIndex:disabled?undefined:tabIndex??0,'aria-disabled':disabled||undefined,'aria-expanded':open,'aria-haspopup':'listbox','aria-controls':open?listId:undefined,'aria-labelledby':labelId,'aria-label':displayLabel,'aria-describedby':describedBy,'aria-required':required||undefined,'aria-readonly':readOnly||undefined,'aria-invalid':error||undefined,...SelectDisplayProps,id:displayId,ref:displayRef,ownerState:state,className:join('MuiSelect-select','MuiSelect-'+variant,multiple&&'MuiSelect-multiple',disabled&&'Mui-disabled',error&&'Mui-error',classes.select,classes[variant],multiple&&classes.multiple,disabled&&classes.disabled,error&&classes.error,className,SelectDisplayProps.className),onMouseDown:event=>{SelectDisplayProps.onMouseDown?.(event);if(!event.defaultPrevented&&!disabled&&!readOnly&&event.button===0){event.preventDefault();display.current.focus();toggle(true,event);}},onKeyDown:event=>{onKeyDown?.(event);SelectDisplayProps.onKeyDown?.(event);if(!event.defaultPrevented&&!disabled&&!readOnly&&[' ','ArrowUp','ArrowDown','Enter'].includes(event.key)){event.preventDefault();toggle(true,event);}},onFocus:event=>{onFocus?.(event);SelectDisplayProps.onFocus?.(event);},onBlur:event=>{if(!open){Object.defineProperty(event,'target',{writable:true,value:{value,name}});onBlur?.(event);SelectDisplayProps.onBlur?.(event);}}},blank?h('span',{className:'notranslate','aria-hidden':true},'\u200b'):content),
  h(Hidden,{...other,'aria-invalid':error,'aria-hidden':true,tabIndex:-1,id:hiddenId,name,disabled,required,readOnly,autoComplete:other.autoComplete,form:other.form,value:Array.isArray(value)?value.join(','):value??'',ref:hidden,ownerState:state,className:join('MuiSelect-nativeInput',classes.nativeInput),onFocus:()=>display.current?.focus(),onChange:event=>{const child=options.find(c=>React.isValidElement(c)&&equal(c.props.value,event.target.value));if(child)change(event,child.props.value,child);}}),
  h(Icon,{as:IconComponent,ownerState:state,className:join('MuiSelect-icon',open&&'MuiSelect-iconOpen',disabled&&'Mui-disabled',classes.icon,open&&classes.iconOpen,disabled&&classes.disabled)}),
  h(Menu,{anchorEl:display.current?.parentNode,open,onClose:event=>toggle(false,event),anchorOrigin:{vertical:'bottom',horizontal:'center'},transformOrigin:{vertical:'top',horizontal:'center'},...MenuProps,slotProps:{...MenuProps.slotProps,list:{'aria-labelledby':labelId,role:'listbox','aria-multiselectable':multiple?'true':undefined,disableListWrap:true,id:listId,...list},paper:{...paper,style:{minWidth:autoWidth?null:display.current?.parentNode?.clientWidth,...paper.style}}}},items));
});
const NativeInput=React.forwardRef(function NativeInput(props,ref){
 const {IconComponent=Arrow,classes=empty,className,variant='outlined',ownerState,multiple,disabled,readOnly,type,...rest}=props,state={...ownerState,...props,variant};
 return h(React.Fragment,null,h(NativeDisplay,{...rest,multiple,disabled,readOnly,ref,ownerState:state,className:join('MuiNativeSelect-select','MuiNativeSelect-'+variant,multiple&&'MuiNativeSelect-multiple',props['aria-invalid']&&'Mui-error',disabled&&'Mui-disabled',classes.select,classes[variant],className)}),!multiple&&h(NativeIcon,{as:IconComponent,ownerState:state,className:join('MuiNativeSelect-icon','MuiNativeSelect-icon'+variant[0].toUpperCase()+variant.slice(1),disabled&&'Mui-disabled',classes.icon)}));
});
const RootInput=styled(Input,{name:'MuiSelect',slot:'Root',overridesResolver:(_,o)=>o.root})({});
const RootOutlined=styled(OutlinedInput,{name:'MuiSelect',slot:'Root',overridesResolver:(_,o)=>o.root})({});
const Select=React.forwardRef(function Select(input,ref){
 const p=useThemeProps({props:input,name:'MuiSelect'}),context=useFormControl();
 const {autoWidth,children,classes=empty,className,defaultOpen,displayEmpty,IconComponent=Arrow,id,input:provided,inputProps=empty,label,labelId,MenuProps,multiple=false,native=false,onClose,onOpen,open,renderValue,SelectDisplayProps,variant:givenVariant,...rest}=p;
 const variant=givenVariant??context?.variant??'outlined',element=provided||h(variant==='standard'?RootInput:RootOutlined,{label});
 if(!provided&&variant==='filled')throw new TypeError('Select filled variant requires an input until FilledInput is implemented');
 const mergedRef=useRefs(ref,element.props.ref);
 const field={children,IconComponent,multiple,variant,classes:{...classes,...inputProps.classes,...element.props.inputProps?.classes},...(native?{id}:{autoWidth,defaultOpen,displayEmpty,labelId,MenuProps,onClose,onOpen,open,renderValue,SelectDisplayProps:{id,...SelectDisplayProps}}),...inputProps,...element.props.inputProps};
 return React.cloneElement(element,{...rest,ref:mergedRef,inputComponent:native?NativeInput:SelectInput,inputProps:field,...((displayEmpty||native&&multiple)&&variant==='outlined'?{notched:true}:{}),className:join('MuiSelect-root',classes.root,className,element.props.className)});
});
Select.muiName='Select';Select.displayName='Select';
module.exports={Select,selectClasses,getSelectUtilityClass};
