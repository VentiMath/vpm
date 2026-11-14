"use strict";
const React=require("react");
const {styled,useThemeProps}=require("./theme.cjs");
const h=React.createElement,empty=Object.freeze({});
const FormControlContext=React.createContext(undefined);
FormControlContext.displayName="FormControlContext";
const useFormControl=()=>React.useContext(FormControlContext);
const own=(o,k)=>o&&Object.hasOwn(o,k)?o[k]:undefined;
const upper=s=>s[0].toUpperCase()+s.slice(1);
const utility=(name,slot)=>["disabled","error","focused","required"].includes(slot)?"Mui-"+slot:"Mui"+name+"-"+slot;
const join=(...parts)=>parts.filter(Boolean).join(" ");
const classes=(name,slots,custom)=>slots.filter(Boolean).map(slot=>join(utility(name,slot),own(custom,slot))).join(" ");
function defaults(props,name){const result={};for(const [key,value]of Object.entries(useThemeProps({props,name})))if(value!==undefined)result[key]=value;return result;}
function inherited(props,context,keys){const state={...props};for(const key of keys)if(state[key]===undefined)state[key]=context?.[key];return state;}
const hasValue=value=>value!=null&&value!==""&&(!Array.isArray(value)||value.length>0);
const filledProps=p=>p&&(hasValue(p.value)||hasValue(p.defaultValue));
function initialState(children){
 let filled=false,adornedStart=false;
 React.Children.forEach(children,child=>{
  if(!React.isValidElement(child))return;
  const name=child.type?.muiName;
  if(name!=="Input"&&name!=="Select")return;
  filled ||= Boolean(filledProps(child.props)||filledProps(child.props.inputProps));
  const input=name==="Select"?child.props.input?.props:child.props;
  adornedStart ||= Boolean(input?.startAdornment);
 });
 return {filled,adornedStart};
}
const FormControlRoot=styled("div",{name:"MuiFormControl",slot:"Root",overridesResolver:({ownerState:s},o)=>[o.root,s.margin!=="none"&&o["margin"+upper(s.margin)],s.fullWidth&&o.fullWidth]})(({ownerState:s})=>({
 display:"inline-flex",flexDirection:"column",position:"relative",minWidth:0,padding:0,margin:0,border:0,verticalAlign:"top",
 ...(s.margin==="normal"?{marginTop:16,marginBottom:8}:s.margin==="dense"?{marginTop:8,marginBottom:4}:{}),...(s.fullWidth?{width:"100%"}:{})
}));
const FormControl=React.forwardRef(function FormControl(input,ref){
 const p=defaults(input,"MuiFormControl");
 const {children,classes:custom=empty,className,component="div",color="primary",disabled=false,error=false,fullWidth=false,focused:controlledFocus,hiddenLabel=false,margin="none",required=false,size="medium",variant="outlined",...rest}=p;
 const [initial]=React.useState(()=>initialState(children));
 const [filled,setFilled]=React.useState(initial.filled),[adornedStart,setAdornedStart]=React.useState(initial.adornedStart),[localFocus,setFocus]=React.useState(false);
 // Reset on this render: re-enabling must not revive an old focus indication.
 if(disabled&&localFocus)setFocus(false);
 const focused=!disabled&&(controlledFocus===undefined?localFocus:controlledFocus);
 const onFocus=React.useCallback(()=>setFocus(true),[]),onBlur=React.useCallback(()=>setFocus(false),[]);
 const onFilled=React.useCallback(()=>setFilled(true),[]),onEmpty=React.useCallback(()=>setFilled(false),[]);
 const registrations=React.useRef(0);
 const registerEffect=React.useCallback(()=>{
  if(process.env.NODE_ENV!=="production"&&registrations.current>0)console.error("FormControl supports one input at a time. Use a separate FormControl for each input.");
  registrations.current++;let active=true;
  return ()=>{if(active){active=false;registrations.current--;}};
 },[]);
 const context=React.useMemo(()=>({adornedStart,color,disabled,error,filled,focused,fullWidth,hiddenLabel,size,required,variant,onFocus,onBlur,onFilled,onEmpty,registerEffect,setAdornedStart}),[adornedStart,color,disabled,error,filled,focused,fullWidth,hiddenLabel,size,required,variant,onFocus,onBlur,onFilled,onEmpty,registerEffect]);
 const ownerState={...p,color,disabled,error,fullWidth,focused,hiddenLabel,margin,required,size,variant};
 return h(FormControlContext.Provider,{value:context},h(FormControlRoot,{...rest,as:component,ref,ownerState,className:join(classes("FormControl",["root",margin!=="none"&&"margin"+upper(margin),fullWidth&&"fullWidth"],custom),className)},children));
});
const FormLabelRoot=styled("label",{name:"MuiFormLabel",slot:"Root",overridesResolver:({ownerState:s},o)=>[o.root,s.color==="secondary"&&o.colorSecondary,s.filled&&o.filled]})(({theme,ownerState:s})=>{
 const palette=theme.vars?.palette||theme.palette,t=theme.typography;
 return {color:palette.text.secondary,...(t.body1||{fontFamily:t.fontFamily,fontWeight:t.fontWeightRegular,fontSize:t.pxToRem?.(16)||"1rem",letterSpacing:"0.00938em"}),lineHeight:"1.4375em",padding:0,position:"relative","&.Mui-focused":{color:own(palette,s.color)?.main},"&.Mui-disabled":{color:palette.text.disabled},"&.Mui-error":{color:palette.error.main}};
});
const FormLabelAsterisk=styled("span",{name:"MuiFormLabel",slot:"Asterisk",overridesResolver:(_,o)=>o.asterisk})(({theme})=>({"&.Mui-error":{color:(theme.vars?.palette||theme.palette).error.main}}));
const FormLabel=React.forwardRef(function FormLabel(input,ref){
 const p=defaults(input,"MuiFormLabel"),context=useFormControl();
 const state=inherited(p,context,["color","disabled","error","filled","focused","required"]);
 const {children,classes:custom=empty,className,component="label",color="primary",disabled,error,filled,focused,required,...rest}=state;
 const ownerState={...state,color};
 return h(FormLabelRoot,{...rest,as:component,ref,ownerState,className:join(classes("FormLabel",["root","color"+upper(color),disabled&&"disabled",error&&"error",filled&&"filled",focused&&"focused",required&&"required"],custom),className)},children,required?h(FormLabelAsterisk,{"aria-hidden":true,ownerState,className:classes("FormLabel",["asterisk",error&&"error"],custom)},"\u2009*"):null);
});
const FormHelperTextRoot=styled("p",{name:"MuiFormHelperText",slot:"Root",overridesResolver:({ownerState:s},o)=>[o.root,s.size&&o["size"+upper(s.size)],s.contained&&o.contained,s.filled&&o.filled]})(({theme,ownerState:s})=>{
 const palette=theme.vars?.palette||theme.palette,t=theme.typography;
 return {color:palette.text.secondary,...(t.caption||{fontFamily:t.fontFamily,fontWeight:t.fontWeightRegular,fontSize:t.pxToRem?.(12)||"0.75rem",lineHeight:1.66,letterSpacing:"0.03333em"}),textAlign:"left",marginTop:s.size==="small"?4:3,marginRight:s.contained?14:0,marginBottom:0,marginLeft:s.contained?14:0,"&.Mui-disabled":{color:palette.text.disabled},"&.Mui-error":{color:palette.error.main}};
});
const FormHelperText=React.forwardRef(function FormHelperText(input,ref){
 const p=defaults(input,"MuiFormHelperText"),context=useFormControl();
 const state=inherited(p,context,["disabled","error","filled","focused","required","size","variant"]);
 const {children,classes:custom=empty,className,component="p",disabled,error,filled,focused,required,size,variant,margin,...rest}=state;
 const contained=variant==="outlined"||variant==="filled",ownerState={...state,contained};
 return h(FormHelperTextRoot,{...rest,as:component,ref,ownerState,className:join(classes("FormHelperText",["root",disabled&&"disabled",error&&"error",size&&"size"+upper(size),contained&&"contained",focused&&"focused",filled&&"filled",required&&"required"],custom),className)},children===" "?h("span",{className:"notranslate","aria-hidden":true},"\u200b"):children);
});
const api={FormControl,FormLabel,FormHelperText,useFormControl};
for(const [name,slots]of Object.entries({FormControl:["root","marginNone","marginNormal","marginDense","fullWidth","disabled"],FormLabel:["root","colorSecondary","focused","disabled","error","filled","required","asterisk"],FormHelperText:["root","error","disabled","sizeSmall","sizeMedium","contained","focused","filled","required"]})){
 api[name].displayName=name;
 api["get"+name+"UtilityClass"]=slot=>utility(name,slot);
 api[name[0].toLowerCase()+name.slice(1)+"Classes"]=Object.freeze(Object.fromEntries(slots.map(slot=>[slot,utility(name,slot)])));
}
module.exports=api;
// The context subpath and both module formats share the same provider identity.
Object.defineProperty(module.exports,"FormControlContext",{value:FormControlContext});
