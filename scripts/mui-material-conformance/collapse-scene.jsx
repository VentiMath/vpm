import React from 'react';
import {Collapse} from '@buttons';
import {ThemeProvider} from '@integration';
import {createTheme} from '@mui/material/styles';
export function makeTheme({mode='light',rtl=false,custom=false,reduced='never'}={}){return createTheme({palette:{mode},direction:rtl?'rtl':'ltr',motion:{reducedMotion:reduced},components:custom?{MuiCollapse:{defaultProps:{timeout:60},styleOverrides:{root:{borderRadius:3},wrapper:{backgroundColor:'rgba(100,100,100,.1)'},wrapperInner:{paddingInline:3}}}}:{}});}
export function PanelScene({kind='preview'}){return <Collapse in={kind!=='closed'} className="collapse-children" sx={kind==='navigation'?{paddingLeft:'16px','& > .MuiCollapse-wrapper':{borderLeft:'1px solid',borderColor:'divider','& > .MuiCollapse-wrapperInner':{paddingLeft:'8px'}}}:undefined}><div style={{padding:8}}>{Array.from({length:kind==='navigation'?6:3},(_,i)=><button key={i}>Contest {i+1}</button>)}</div></Collapse>}
export function HydrationScene(){return <ThemeProvider theme={makeTheme()}><Collapse id="hydrated" in><button>Archive preview</button></Collapse></ThemeProvider>}
export function VariantScene({mode,rtl,custom,reduced='never',tick=0}){
 const [open,setOpen]=React.useState(false),[height,setHeight]=React.useState(120),[mounted,setMounted]=React.useState(true),[config,setConfig]=React.useState({});
 const ref=React.useRef(),wrapRef=React.useRef();const events=React.useRef([]),ends=React.useRef([]);
 const {listener,...collapseOptions}=config;
 const callbacks=Object.fromEntries(['onEnter','onEntering','onEntered','onExit','onExiting','onExited'].map(name=>[name,(node,appearing)=>events.current.push({name,appearing,node:node===ref.current,height:node.style.height,width:node.style.width,duration:node.style.transitionDuration})]));
 window.collapseControls={setOpen,setHeight,setMounted,setConfig,ref,wrapRef,events,ends};
 return <ThemeProvider theme={makeTheme({mode,rtl,custom,reduced})}><div id="cases" dir={rtl?'rtl':'ltr'} style={{width:320}}><PanelScene kind="navigation"/><PanelScene kind="closed"/>
 <Collapse id="small" collapsedSize={18}><div style={{height:120}}>Closed preview</div></Collapse>
 <Collapse id="horizontal" orientation="horizontal" in><div style={{width:180,height:40}}>Horizontal preview</div></Collapse>
 {mounted&&<Collapse id="live" ref={ref} in={open} timeout={60} {...collapseOptions} {...callbacks} addEndListener={listener?(node,done)=>ends.current.push(done):undefined} {...(VPM_MATERIAL_CURRENT?{slotProps:{wrapper:{ref:wrapRef}}}:{})} data-tick={tick}><div id="content" style={{height,width:180}}><button id="focus">Examination preview</button></div></Collapse>}
 </div></ThemeProvider>;
}
