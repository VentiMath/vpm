"use strict";
const React=require("react");
const {styled,useThemeProps,GlobalStyles}=require("./theme.cjs");
const {useFormControl,FormControlContext}=require("./forms.cjs");
const h=React.createElement,empty=Object.freeze({});
const own=(o,k)=>o&&Object.hasOwn(o,k)?o[k]:undefined;
const join=(...xs)=>xs.filter(Boolean).join(" ");
const upper=s=>s[0].toUpperCase()+s.slice(1);
const utility=slot=>["focused","disabled","error","readOnly"].includes(slot)?"Mui-"+slot:"MuiInputBase-"+slot;
function classes(slots,custom){let result="";for(const slot of slots)if(slot){if(result)result+=" ";result+=utility(slot);const extra=own(custom,slot);if(extra)result+=" "+extra;}return result;}
const present=value=>value!=null&&value!==""&&(!Array.isArray(value)||value.length>0);
const layoutEffect=typeof window==="undefined"?React.useEffect:React.useLayoutEffect;
function useRefs(...refs){return React.useMemo(()=>node=>{
 const disposers=refs.map(ref=>{if(typeof ref==="function"){const cleanup=ref(node);return typeof cleanup==="function"?cleanup:()=>ref(null);}if(ref)ref.current=node;return ()=>{if(ref)ref.current=null;};});
 return ()=>{for(const dispose of disposers)dispose();};
},refs);}
const keyframes={"@keyframes mui-auto-fill":{from:{animationName:"mui-auto-fill"}},"@keyframes mui-auto-fill-cancel":{from:{animationName:"mui-auto-fill-cancel"}}};
const InputBaseRoot=styled("div",{name:"MuiInputBase",slot:"Root",overridesResolver:({ownerState:s},o)=>[o.root,s.formControl&&o.formControl,s.startAdornment&&o.adornedStart,s.endAdornment&&o.adornedEnd,s.error&&o.error,s.size==="small"&&o.sizeSmall,s.multiline&&o.multiline,s.color&&s.color!=="primary"&&own(o,"color"+upper(s.color)),s.fullWidth&&o.fullWidth,s.hiddenLabel&&o.hiddenLabel]})(({theme,ownerState:s})=>({
 ...(theme.typography.body1||{fontFamily:theme.typography.fontFamily,fontWeight:theme.typography.fontWeightRegular,fontSize:"1rem",letterSpacing:"0.00938em"}),lineHeight:"1.4375em",color:(theme.vars?.palette||theme.palette).text.primary,boxSizing:"border-box",position:"relative",cursor:"text",display:"inline-flex",alignItems:"center",
 "&.Mui-disabled":{color:(theme.vars?.palette||theme.palette).text.disabled,cursor:"default"},
 ...(s.multiline?{padding:s.size==="small"?"1px 0 5px":"4px 0 5px"}:{}),...(s.fullWidth?{width:"100%"}:{})
}));
const InputBaseInput=styled("input",{name:"MuiInputBase",slot:"Input",overridesResolver:({ownerState:s},o)=>[o.input,s.size==="small"&&o.inputSizeSmall,s.multiline&&o.inputMultiline,s.type==="search"&&o.inputTypeSearch,s.startAdornment&&o.inputAdornedStart,s.endAdornment&&o.inputAdornedEnd,s.hiddenLabel&&o.inputHiddenLabel]})('font:inherit;letter-spacing:inherit;color:currentColor;border:0;box-sizing:content-box;background:none;height:1.4375em;margin:0;-webkit-tap-highlight-color:transparent;display:block;min-width:0;width:100%;animation-name:mui-auto-fill-cancel;animation-duration:10ms;&:focus{outline:0;}&:invalid{box-shadow:none;}&::-webkit-search-decoration{-webkit-appearance:none;}&:-webkit-autofill{animation-duration:5000s;animation-name:mui-auto-fill;}',({theme,ownerState:s})=>{
 const palette=theme.vars?.palette||theme.palette;
 const placeholder={color:"currentColor",opacity:theme.vars?.opacity?.inputPlaceholder??(theme.palette.mode==="dark"?.5:.42),transition:theme.transitions?.create?.("opacity",{duration:theme.transitions.duration.shorter})||"opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms"};
 return {padding:s.size==="small"?"1px 0 5px":"4px 0 5px",
 "&::placeholder":placeholder,
 "label[data-shrink=false] + .MuiInputBase-formControl &::placeholder":{opacity:"0 !important"},"label[data-shrink=false] + .MuiInputBase-formControl &:focus::placeholder":{opacity:placeholder.opacity},
 "&.Mui-disabled":{opacity:1,WebkitTextFillColor:palette.text.disabled},
 ...(s.type==="search"?{MozAppearance:"textfield"}:{}),...(s.multiline?{height:"auto",resize:"none",padding:0,paddingTop:0}:{})};
});
// Measurement is owned by this textarea, in its own document. It never replaces
// the editable node or reads user data into HTML. Only width changes schedule RO
// work, avoiding a resize-height feedback loop.
function useAutosize(enabled,rows,minRows,maxRows){
 const measure=React.useRef(()=>{});
 const attach=React.useCallback(node=>{
  if(!enabled||node?.tagName!=="TEXTAREA")return;
  const doc=node.ownerDocument,win=doc.defaultView;if(!win)return;
  const mirror=doc.createElement("textarea");mirror.setAttribute("aria-hidden","true");mirror.tabIndex=-1;mirror.readOnly=true;mirror.dataset.vpmInputMeasure="";
  Object.assign(mirror.style,{position:"absolute",visibility:"hidden",overflow:"hidden",height:"0px",top:"0px",left:"-10000px",pointerEvents:"none"});doc.body.append(mirror);
  const numeric=v=>Number.parseFloat(v)||0;let frame=0,lastWidth=-1;
  const resize=()=>{
   const style=win.getComputedStyle(node),width=numeric(style.width);if(!width||style.display==="none")return;
   for(const key of ["font","letterSpacing","lineHeight","textIndent","textTransform","wordSpacing","tabSize","whiteSpace","wordBreak","overflowWrap","boxSizing","paddingLeft","paddingRight","borderLeftWidth","borderRightWidth","borderStyle"])mirror.style[key]=style[key];
   Object.assign(mirror.style,{width:style.width,paddingTop:"0",paddingBottom:"0",borderTopWidth:"0",borderBottomWidth:"0"});
   mirror.value="x";const line=mirror.scrollHeight||numeric(style.lineHeight)||20;
   mirror.value=node.value||node.placeholder||"x";if(mirror.value.endsWith("\n"))mirror.value+=" ";
   const natural=mirror.scrollHeight,min=Math.max(1,Number(rows||minRows)||1),max=rows?min:Math.max(min,Number(maxRows)||Infinity),content=Math.max(min*line,Math.min(max*line,natural));
   const extra=style.boxSizing==="border-box"?numeric(style.paddingTop)+numeric(style.paddingBottom)+numeric(style.borderTopWidth)+numeric(style.borderBottomWidth):0;
   const height=content+extra+"px";if(node.style.height!==height)node.style.height=height;node.style.overflow=Math.abs(natural-content)<=1?"hidden":"auto";
  };
  measure.current=resize;resize();
  const request=win.requestAnimationFrame?.bind(win)||(callback=>win.setTimeout(callback,16)),cancel=win.cancelAnimationFrame?.bind(win)||win.clearTimeout.bind(win);
  const schedule=()=>{if(!frame)frame=request(()=>{frame=0;resize();});};
  const observer=win.ResizeObserver?new win.ResizeObserver(entries=>{const width=entries[0]?.contentRect.width;if(width!==lastWidth){lastWidth=width;schedule();}}):null;
  observer?.observe(node);win.addEventListener("resize",schedule);
  return()=>{measure.current=()=>{};observer?.disconnect();win.removeEventListener("resize",schedule);if(frame)cancel(frame);mirror.remove();};
 },[enabled,rows,minRows,maxRows]);
 layoutEffect(()=>{measure.current();});
 return {measure,attach};
}
const InputBase=React.forwardRef(function InputBase(input,forwardedRef){
 const resolved=useThemeProps({props:input,name:"MuiInputBase"}),p={};for(const key of Object.keys(resolved))if(resolved[key]!==undefined)p[key]=resolved[key];
 const context=useFormControl();
 const {classes:custom=empty,className,slots=empty,slotProps=empty,components=empty,componentsProps=empty,inputComponent="input",inputProps=empty,inputRef,autoComplete,autoFocus,defaultValue,id,name,placeholder,readOnly,rows,minRows,maxRows,multiline=false,fullWidth=false,startAdornment,endAdornment,disableInjectingGlobalStyles=false,renderSuffix,type="text",value,onChange,onFocus,onBlur,onKeyDown,onKeyUp,onInvalid,onClick,disabled:ownDisabled,error:ownError,color:ownColor,size:ownSize,hiddenLabel:ownHidden,margin,required:ownRequired,"aria-describedby":describedBy,"aria-label":label,...rest}=p;
 const inherit=(key,explicit)=>explicit===undefined?context?.[key]:explicit;
 const disabled=inherit("disabled",ownDisabled),error=inherit("error",ownError),required=inherit("required",ownRequired),color=inherit("color",ownColor)||"primary",size=inherit("size",ownSize),hiddenLabel=inherit("hiddenLabel",ownHidden);
 const [localFocus,setFocus]=React.useState(false);const focused=context?context.focused:localFocus;
 const rootProps=slotProps.root||componentsProps.root||empty,extra={...inputProps,...(slotProps.input||componentsProps.input)};
 const fieldValue=extra.value!==undefined?extra.value:value;
 const controlled=React.useRef(fieldValue!=null).current,node=React.useRef(null);
 const auto=multiline&&inputComponent==="input",sizing=useAutosize(auto,rows,minRows,maxRows);
 const ref=useRefs(node,sizing.attach,inputRef,inputProps.ref,slotProps.input?.ref||componentsProps.input?.ref),rootRef=useRefs(forwardedRef,rootProps.ref);
 const updateFilled=value=>{if(context)(present(value)?context.onFilled:context.onEmpty)();};
 layoutEffect(()=>{if(controlled)updateFilled(fieldValue);},[fieldValue,controlled,context?.onFilled,context?.onEmpty]);
 React.useEffect(()=>{updateFilled(node.current?.value);},[]);
 React.useEffect(()=>context?.registerEffect?.(),[context?.registerEffect]);
 React.useEffect(()=>{context?.setAdornedStart(Boolean(startAdornment));},[context?.setAdornedStart,startAdornment]);
 React.useEffect(()=>{if(!context&&disabled&&localFocus){setFocus(false);onBlur?.();}},[disabled,context,localFocus]);
 const state={...p,color,disabled,error,required,size,hiddenLabel,focused,formControl:context,fullWidth,multiline,startAdornment,endAdornment,type};
 const rootClass=join(classes(["root","color"+upper(color),disabled&&"disabled",error&&"error",fullWidth&&"fullWidth",focused&&"focused",context&&"formControl",size==="small"&&"sizeSmall",multiline&&"multiline",startAdornment&&"adornedStart",endAdornment&&"adornedEnd",hiddenLabel&&"hiddenLabel",readOnly&&"readOnly"],custom),readOnly&&"MuiInputBase-readOnly",rootProps.className,className);
 const fieldClass=join(classes(["input",disabled&&"disabled",type==="search"&&"inputTypeSearch",readOnly&&"readOnly"],custom),readOnly&&"MuiInputBase-readOnly",extra.className);
 const Root=slots.root||components.Root||InputBaseRoot,Field=slots.input||components.Input||InputBaseInput;
 const focus=event=>{if(disabled){event.stopPropagation();return;}onFocus?.(event);extra.onFocus?.(event);if(context)context.onFocus(event);else setFocus(true);};
 const blur=event=>{onBlur?.(event);extra.onBlur?.(event);if(context)context.onBlur(event);else setFocus(false);};
 const change=(event,...args)=>{if(!controlled)updateFilled(node.current?.value??event.target.value);sizing.measure.current();extra.onChange?.(event,...args);onChange?.(event,...args);};
 const animation=event=>{if(event.animationName==="mui-auto-fill")updateFilled("autofilled");else if(event.animationName==="mui-auto-fill-cancel")updateFilled(node.current?.value);extra.onAnimationStart?.(event);};
 const fieldProps={"aria-invalid":error,"aria-describedby":describedBy,"aria-label":label,autoComplete,autoFocus,defaultValue,disabled,id,name,placeholder,readOnly,required,rows,value:fieldValue,onKeyDown,onKeyUp,type:auto?undefined:type,...extra,ref,className:fieldClass,onBlur:blur,onChange:change,onFocus:focus,onAnimationStart:animation};
 delete fieldProps.ownerState;
 const actual=auto?"textarea":inputComponent;
 if(typeof Field!=="string"){fieldProps.as=actual;fieldProps.ownerState={...state,...extra.ownerState};}
 const rootOptions={...rootProps,...rest,...(onInvalid===undefined?{}:{onInvalid}),required:ownRequired,ref:rootRef,onClick:event=>{if(event.target===event.currentTarget)node.current?.focus?.();onClick?.(event);},className:rootClass};
 delete rootOptions.ownerState;
 if(typeof Root!=="string")rootOptions.ownerState={...state,...rootProps.ownerState};
 return h(React.Fragment,null,!disableInjectingGlobalStyles&&h(GlobalStyles,{styles:keyframes}),h(Root,rootOptions,startAdornment,h(FormControlContext.Provider,{value:undefined},h(Field,fieldProps)),endAdornment,renderSuffix?.({color,disabled,error,hiddenLabel,size,required,filled:context?.filled,focused,startAdornment,margin:inherit("margin",margin)})));
});
InputBase.displayName="InputBase";
const inputBaseClasses=Object.freeze(Object.fromEntries(["root","formControl","focused","disabled","adornedStart","adornedEnd","error","sizeSmall","multiline","colorSecondary","fullWidth","hiddenLabel","readOnly","input","inputTypeSearch"].map(slot=>[slot,utility(slot)])));
module.exports={InputBase,inputBaseClasses,getInputBaseUtilityClass:utility};

// Internal styled primitives shared by the independent input variants.
Object.defineProperties(module.exports,{InputBaseRoot:{value:InputBaseRoot},InputBaseInput:{value:InputBaseInput}});
