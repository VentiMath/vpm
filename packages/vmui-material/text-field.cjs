'use strict';
const React=require('react');
const {styled,useThemeProps}=require('./theme.cjs');
const {FormControl,FormHelperText}=require('./forms.cjs');
const {InputLabel}=require('./input-decorations.cjs');
const {Input,OutlinedInput}=require('./input-variants.cjs');
const h=React.createElement,empty=Object.freeze({});
const join=(...values)=>values.filter(Boolean).join(' ');
const Root=styled(FormControl,{name:'MuiTextField',slot:'Root',shouldForwardProp:p=>!['theme','sx','as','ownerState'].includes(p),overridesResolver:(_,o)=>o.root})({});
function useRefs(a,b){return React.useMemo(()=>{
 if(!a)return b;if(!b)return a;
 return node=>{const clean=[a,b].map(ref=>{if(typeof ref==='function'){const result=ref(node);return typeof result==='function'?result:()=>ref(null);}ref.current=node;return()=>{ref.current=null;};});return()=>{for(const release of clean)release();};};
},[a,b]);}
const resolve=(value,state)=>typeof value==='function'?value(state):value||empty;
function slotProps(Component,props,state){return typeof Component==='string'?props:{...props,ownerState:{...state,...props.ownerState}};}
const TextField=React.forwardRef(function TextField(input,forwardedRef){
 const p=useThemeProps({props:input,name:'MuiTextField'});
 const {autoComplete,autoFocus=false,children,classes=empty,className,color='primary',defaultValue,disabled=false,error=false,fullWidth=false,helperText,id:explicitId,inputRef,label,maxRows,minRows,multiline=false,name,onBlur,onChange,onFocus,placeholder,required=false,rows,select=false,slots=empty,slotProps:given=empty,type,value,variant='outlined',InputProps,InputLabelProps,inputProps:legacyHtml,FormHelperTextProps,SelectProps,...other}=p;
 const state={...p,autoFocus,color,disabled,error,fullWidth,multiline,required,select,variant};
 const generated=React.useId(),id=explicitId??generated,helperId=helperText&&id?id+'-helper-text':undefined,labelId=label&&id?id+'-label':undefined;
 const root=resolve(given.root,state),field=resolve(given.input??InputProps,state),caption=resolve(given.inputLabel??InputLabelProps,state),html=resolve(given.htmlInput??legacyHtml,state),helper=resolve(given.formHelperText??FormHelperTextProps,state),selection=resolve(given.select??SelectProps,state);
 const rootRef=useRefs(forwardedRef,root.ref);
 const RootSlot=slots.root||Root,Field=slots.input||(variant==='outlined'?OutlinedInput:variant==='standard'?Input:null),Label=slots.inputLabel||InputLabel,Helper=slots.formHelperText||FormHelperText;
 if(!Field)throw new TypeError('TextField filled variant requires slots.input until FilledInput is implemented');
 if(select&&!slots.select)throw new TypeError('TextField select requires slots.select until Select/MenuItem are implemented');
 const extra=variant==='outlined'?{label,...(caption.shrink===undefined?{}:{notched:caption.shrink})}:{};
 const fieldId=select&&!selection.native?undefined:id;
 const element=h(Field,slotProps(Field,{
  'aria-describedby':helperId,autoComplete,autoFocus,defaultValue,fullWidth,multiline,name,placeholder,rows,maxRows,minRows,type,value,id:fieldId,inputRef,onBlur,onChange,onFocus,
  ...extra,inputProps:html,slots:slots.htmlInput?{input:slots.htmlInput}:undefined,...field
 },state));
 const rootProps={...other,disabled,error,fullWidth,required,color,variant,...root,className:join('MuiTextField-root',Object.hasOwn(classes,'root')&&classes.root,className,root.className),ref:rootRef};
 if(other.style||root.style)rootProps.style={...other.style,...root.style};
 // A caller-supplied select receives the same input element and identifiers as
 // Material. No upstream select implementation or silent native fallback ships.
 const control=select?h(slots.select,slotProps(slots.select,{id,labelId,value,defaultValue,input:element,'aria-describedby':helperId,...selection},state),children):element;
 return h(RootSlot,slotProps(RootSlot,rootProps,state),label!=null&&label!==''?h(Label,slotProps(Label,{...(select&&!selection.native?{component:'div'}:{htmlFor:id}),id:labelId,...caption},state),label):null,control,helperText?h(Helper,slotProps(Helper,{id:helperId,...helper},state),helperText):helperText);
});
TextField.displayName='TextField';
module.exports={TextField,textFieldClasses:Object.freeze({root:'MuiTextField-root'}),getTextFieldUtilityClass:slot=>'MuiTextField-'+slot};
