"use strict";
const React=require("react"),{createFilterOptions}=require("./option-filter.cjs");
const defaultFilter=createFilterOptions(),labelOf=value=>String(value?.label??value??"");
function useAutocomplete(p){
 const {options=[],multiple=false,freeSolo=false,disabled=false,readOnly=false,disableClearable=false,
  getOptionLabel=labelOf,isOptionEqualToValue=(a,b)=>a===b,getOptionKey,getOptionDisabled,filterOptions=defaultFilter,filterSelectedOptions=false,
  autoHighlight=false,autoSelect=false,openOnFocus=false,clearOnBlur=!freeSolo,clearOnEscape=false,selectOnFocus=!freeSolo,
  handleHomeEndKeys=!freeSolo,disableListWrap=false,disabledItemsFocusable=false,includeInputInList=false,disableCloseOnSelect=false,blurOnSelect=false,groupBy}=p;
 const generated=React.useId(),id=p.id??generated,input=React.useRef(null),list=React.useRef(null),previous=React.useRef(),pointer=React.useRef(false);
 const [localValue,setValue]=React.useState(()=>p.defaultValue??(multiple?[]:null)),value=p.value===undefined?localValue:p.value;
 const label=value==null||multiple?"":String(getOptionLabel(value));
 const [localText,setText]=React.useState(label),inputValue=p.inputValue===undefined?localText:p.inputValue;
 const [localOpen,setOpen]=React.useState(false),popupOpen=!!((p.open===undefined?localOpen:p.open)&&!readOnly&&!disabled);
 const [focused,setFocused]=React.useState(false),[focusedTag,setFocusedTag]=React.useState(-1),[highlight,setHighlight]=React.useState(-1),[anchorEl,setAnchorEl]=React.useState(null),[pristine,setPristine]=React.useState(true);
 const selected=multiple?value||[]:value==null?[]:[value],contains=o=>selected.some(v=>isOptionEqualToValue(o,v));
 const available=filterOptions(filterSelectedOptions?options.filter(o=>!contains(o)):options,{inputValue:!multiple&&inputValue===label&&pristine?"":inputValue,getOptionLabel});
 const filtered=popupOpen?available:[];
 const usable=i=>i>=0&&i<filtered.length&&(disabledItemsFocusable||!getOptionDisabled?.(filtered[i]));
 const index=usable(highlight)?highlight:autoHighlight?filtered.findIndex((_,i)=>usable(i)):-1;
 function text(event,next,reason){if(next===inputValue)return;if(p.inputValue===undefined)setText(next);p.onInputChange?.(event,next,reason)}
 function open(event){if(popupOpen||disabled||readOnly)return;if(p.open===undefined)setOpen(true);setPristine(true);p.onOpen?.(event)}
 function close(event,reason){if(!popupOpen)return;if(p.open===undefined)setOpen(false);p.onClose?.(event,reason)}
 function change(event,next,reason,details){if(readOnly||disabled)return;const same=multiple?value?.length===next.length&&value.every((v,i)=>v===next[i]):value===next;if(!same){if(p.value===undefined)setValue(next);p.onChange?.(event,next,reason,details)}}
 function select(event,option,reason="selectOption"){
  let next=option;
  if(multiple){next=[...selected];const at=next.findIndex(v=>isOptionEqualToValue(option,v));if(at<0)next.push(option);else if(reason!=="createOption"){next.splice(at,1);reason="removeOption"}}
  text(event,multiple?"":String(getOptionLabel(option)),reason);change(event,next,reason,{option});
  if(!disableCloseOnSelect&&!event?.ctrlKey&&!event?.metaKey)close(event,reason);
  if(blurOnSelect===true||blurOnSelect===(pointer.current?"touch":"mouse"))input.current?.blur();pointer.current=false;
 }
 function mark(event,next,reason){setHighlight(next);p.onHighlightChange?.(event,filtered[next]??null,reason)}
 function move(event,delta){
  if(!popupOpen){open(event);return;}
  const length=filtered.length;if(!length)return;
  let next=index;for(let count=0;count<=length;count++){
   next+=delta;if(next>=length){if(disableListWrap){next=length-1;break}next=includeInputInList?-1:0}
   if(next<0){if(includeInputInList&&next===-1)break;if(disableListWrap){next=0;break}next=length-1}
   if(usable(next))break;
  }mark(event,usable(next)?next:-1,"keyboard");
 }
 function remove(event,at){if(readOnly||disabled)return;const option=selected[at];if(option===undefined)return;change(event,selected.filter((_,i)=>i!==at),"removeOption",{option})}
 function key(event){
  if(event.defaultMuiPrevented||event.defaultPrevented||disabled||readOnly||event.isComposing||event.nativeEvent?.isComposing||event.keyCode===229)return;
  const name=event.key;
  if(name==="ArrowDown"||name==="ArrowUp"){event.preventDefault();move(event,name==="ArrowDown"?1:-1)}
  else if((name==="Home"||name==="End")&&popupOpen&&handleHomeEndKeys){event.preventDefault();let n=name==="Home"?0:filtered.length-1;const d=name==="Home"?1:-1;while(n>=0&&n<filtered.length&&!usable(n))n+=d;mark(event,usable(n)?n:-1,"keyboard")}
  else if(name==="PageDown"||name==="PageUp"){if(popupOpen){event.preventDefault();const n=Math.min(filtered.length-1,Math.max(0,index+(name==="PageDown"?5:-5)));if(usable(n))mark(event,n,"keyboard")}}
  else if(name==="Enter"){if(popupOpen&&index>=0&&!getOptionDisabled?.(filtered[index])){event.preventDefault();select(event,filtered[index])}else if(freeSolo&&inputValue&&inputValue!==label){event.preventDefault();select(event,inputValue,"createOption")}}
  else if(name==="Escape"){if(popupOpen){event.preventDefault();event.stopPropagation();close(event,"escape")}else if(clearOnEscape&&!disableClearable){text(event,"","clear");change(event,multiple?[]:null,"clear")}}
  else if(multiple&&!inputValue&&name==="Backspace")remove(event,focusedTag<0?selected.length-1:focusedTag);
 }
 React.useEffect(()=>{if(previous.current!==value){previous.current=value;text(null,label,"reset")}},[value,label]);
 React.useEffect(()=>{const node=input.current;if(!node)return;if(popupOpen&&index>=0)node.setAttribute("aria-activedescendant",id+"-option-"+index);else node.removeAttribute("aria-activedescendant");
  for(const option of list.current?.querySelectorAll('[data-option-index]')||[]){const active=Number(option.dataset.optionIndex)===index;option.classList.toggle("Mui-focused",active);option.classList.toggle("Mui-focusVisible",active)}
 },[index,popupOpen,id,inputValue]);
 const groupedOptions=groupBy?filtered.reduce((groups,option,i)=>{const name=groupBy(option),last=groups.at(-1);if(last?.group===name)last.options.push(option);else groups.push({key:i,index:i,group:name,options:[option]});return groups},[]):filtered;
 return {id,value,inputValue,groupedOptions,popupOpen,expanded:popupOpen&&anchorEl,focused,focusedTag,anchorEl,setAnchorEl,dirty:freeSolo&&inputValue!==""||selected.length>0,
  getRootProps:(other={})=>({...other,onKeyDown:event=>{other.onKeyDown?.(event);key(event)},onMouseDown:event=>{other.onMouseDown?.(event);if(!event.defaultPrevented&&event.target===event.currentTarget)event.preventDefault()},onClick:event=>{other.onClick?.(event);if(!event.defaultPrevented)input.current?.focus()}}),
  getInputLabelProps:()=>({id:id+"-label",htmlFor:id}),
  getInputProps:()=>({id,ref:input,value:inputValue,disabled,readOnly,role:"combobox",autoComplete:"off",autoCapitalize:"none",spellCheck:"false","aria-autocomplete":p.autoComplete?"both":"list","aria-expanded":popupOpen,"aria-controls":popupOpen?id+"-listbox":undefined,"aria-activedescendant":popupOpen&&index>=0?id+"-option-"+index:undefined,
   onFocus:event=>{setFocused(true);if(selectOnFocus)event.target.select();if(openOnFocus)open(event)},
   onBlur:event=>{if(list.current?.contains(event.relatedTarget)){input.current?.focus();return}setFocused(false);setFocusedTag(-1);if(autoSelect&&index>=0&&popupOpen)select(event,filtered[index],"blur");else if(autoSelect&&freeSolo&&inputValue)select(event,inputValue,"blur");else if(clearOnBlur)text(event,label,"blur");close(event,"blur")},
   onChange:event=>{const next=event.target.value;setPristine(false);text(event,next,"input");setHighlight(-1);if(next)open(event);else if(!disableClearable&&!multiple)change(event,null,"clear")},
  }),
  getClearProps:()=>({type:"button",tabIndex:-1,onClick:event=>{text(event,"","clear");change(event,multiple?[]:null,"clear");input.current?.focus()}}),
  getPopupIndicatorProps:()=>({type:"button",tabIndex:-1,onClick:event=>popupOpen?close(event,"toggleInput"):open(event)}),
  getListboxProps:()=>({role:"listbox",id:id+"-listbox","aria-labelledby":id+"-label",ref:list,onMouseDown:event=>event.preventDefault()}),
  getOptionProps:({option,index:i})=>({key:getOptionKey?.(option)??getOptionLabel(option),id:id+"-option-"+i,role:"option",tabIndex:-1,"data-option-index":i,"aria-disabled":!!getOptionDisabled?.(option),"aria-selected":contains(option),onMouseMove:event=>{if(usable(i))mark(event,i,"mouse")},onTouchStart:event=>{pointer.current=true;if(usable(i))mark(event,i,"touch")},onClick:event=>{if(!getOptionDisabled?.(option))select(event,option)}}),
  getTagProps:({index:i})=>({key:i,"data-tag-index":i,tabIndex:-1,...(!readOnly&&{onDelete:event=>remove(event,i)})}),
  getItemProps:({index:i}={index:0})=>({key:i,"data-item-index":i,tabIndex:-1,...(!readOnly&&{onDelete:event=>multiple?remove(event,i):change(event,null,"removeOption",{option:value})})}),
 };
}
module.exports={useAutocomplete,createFilterOptions};
