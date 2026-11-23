import React from 'react';
import {Fade,Unstable_TrapFocus,TablePagination,useAutocomplete,Tabs,Tab,Popover} from '@buttons';
export function Scene({kind='pagination',...props}) {
 if(kind==='fade')return <Fade in={!!props.open} timeout={0}><div id="faded">Preview</div></Fade>;
 if(kind==='focus')return <><button id="outside">Outside</button><Unstable_TrapFocus open={!!props.open} disableAutoFocus={props.disableAutoFocus} disableEnforceFocus={props.disableEnforceFocus} disableRestoreFocus={props.disableRestoreFocus}><div id="trap"><button id="first">First</button><button id="last">Last</button></div></Unstable_TrapFocus></>;
 if(kind==='tabs')return <div style={{width:220,height:props.orientation==='vertical'?160:undefined,direction:props.rtl?'rtl':'ltr'}}><Tabs value={props.value??0} onChange={(_,v)=>window.events.push(v)} variant="scrollable" orientation={props.orientation} scrollButtons="auto" allowScrollButtonsMobile aria-label="Learners">{Array.from({length:8},(_,i)=><Tab key={i} label={'Learner '+i} />)}</Tabs></div>;
 if(kind==='auto')return <Hook {...props}/>;
 if(kind==='popover')return <Popover open component="section" transitionDuration={0} anchorReference="anchorPosition" anchorPosition={{top:10,left:10}}><button>Preview</button></Popover>;
 return <TablePagination component="div" count={props.count??27} page={props.page??0} rowsPerPage={props.rows??10} onPageChange={(_,v)=>window.events.push(['page',v])} onRowsPerPageChange={e=>window.events.push(['rows',e.target.value])} rowsPerPageOptions={props.options??[10,25,50]} showFirstButton showLastButton {...props}/>;
}
function Hook(props){const a=useAutocomplete({options:['Ada','Emmy','Sofia'],...props,onChange:(_,v,r)=>window.events.push([v,r])});return <div {...a.getRootProps()}><label {...a.getInputLabelProps()}>Mathematician</label><input {...a.getInputProps()}/><button {...a.getClearProps()}>Clear</button><button {...a.getPopupIndicatorProps()}>Open</button>{a.popupOpen&&<ul {...a.getListboxProps()}>{a.groupedOptions.map((option,index)=>{const {key,...p}=a.getOptionProps({option,index});return <li key={key} {...p}>{option}</li>})}</ul>}</div>}
