import React from 'react';
import {createRoot} from 'react-dom/client';
import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';import {ThemeProvider} from '@integration';
import {Dialog,DialogTitle,DialogContent,DialogActions,Menu,MenuItem} from '@buttons';
import Slide from '@slide-control';
export function makeTheme({mode='light',variables=false,rtl=false,custom=false,reduced='never'}={}){return createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,motion:{reducedMotion:reduced},components:custom?{MuiPaper:{styleOverrides:{root:{backgroundImage:'none'}}},MuiDialog:{defaultProps:{fullWidth:true},styleOverrides:{paper:{borderRadius:32},container:{padding:0},backdrop:{backgroundColor:'rgba(20, 30, 50, .4)'}}}}:{}})}
const SlideTransition=React.forwardRef(function SlideTransition(props,ref){return <Slide direction="left" {...props} ref={ref}/>});
export function PanelScene({kind='inline'}){return <Dialog open={kind!=='closed'} disablePortal={kind!=='portal'} keepMounted={kind==='retained'} transitionDuration={0} fullWidth maxWidth="sm"><DialogTitle>Contact WARML</DialogTitle><DialogContent sx={{display:'flex',flexDirection:'column',gap:2,pt:'1rem !important'}}><label>Name<input defaultValue="Synthetic participant"/></label><label>Message<textarea defaultValue="Question about practice"/></label></DialogContent><DialogActions><button>Cancel</button><button>Send</button></DialogActions></Dialog>}
export function HydrationScene(){return <ThemeProvider theme={makeTheme()}><Dialog open disablePortal transitionDuration={0}><DialogTitle>Hydrated reminder</DialogTitle><DialogContent><input id="hydrated" defaultValue="Draft"/></DialogContent></Dialog></ThemeProvider>}
export function VariantScene(props){
 const {mode='light',variables=false,rtl=false,custom=false,reduced='never',tick=0,frameContainer}=props;
 const [open,setOpen]=React.useState(false),[nested,setNested]=React.useState(false),[menu,setMenu]=React.useState(null),[config,setConfig]=React.useState({}),[content,setContent]=React.useState(false);
 const events=React.useRef([]),ref=React.useRef(),paperRef=React.useRef();
 const theme=React.useMemo(()=>makeTheme({mode,variables,rtl,custom,reduced}),[mode,variables,rtl,custom,reduced]);
 const cache=React.useMemo(()=>createCache({key:rtl?'dialogrtl':'dialogltr',container:frameContainer?.ownerDocument.head,stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const {slide,legacy,slow=false,hold=false,auto=true,...options}=config;
 const close=(event,reason)=>{events.current.push(reason);if(!hold)setOpen(false)};
 React.useEffect(()=>{(frameContainer?.ownerDocument.defaultView||window).dialogControls={open,setOpen,setNested,setConfig,setContent,ref,paperRef,events}},[open,frameContainer]);
 const callbacks={onEnter:()=>events.current.push('enter'),onEntered:()=>events.current.push('entered'),onExit:()=>events.current.push('exit'),onExited:()=>events.current.push('exited')};
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="fixture" dir={rtl?'rtl':'ltr'} data-tick={tick}>
 <button id="trigger" onClick={()=>setOpen(true)}>Open reminder</button><button id="outside">Outside</button>
 <Dialog id="main-dialog" ref={ref} open={open} onClose={close} transitionDuration={slow?200:0} container={frameContainer} {...options} {...(slide&&legacy?{TransitionComponent:SlideTransition}:{} )} slots={slide&&!legacy?{transition:SlideTransition}:undefined}
 slotProps={{paper:{ref:paperRef,'data-paper':'main'},backdrop:{invisible:!!slide},transition:callbacks}}>
  <DialogTitle>Reminder form</DialogTitle><DialogContent><label>Name<input id="first" autoFocus={auto} defaultValue="Keep this draft"/></label><p id="extra" style={{height:content?700:80}}>Synthetic form content</p><button id="menu-open" onClick={e=>setMenu(e.currentTarget)}>Schedule</button><button id="nested-open" onClick={()=>setNested(true)}>Details</button><button id="last" onClick={()=>setOpen(false)}>Save</button></DialogContent>
  <Dialog open={nested} container={frameContainer} onClose={()=>setNested(false)} transitionDuration={0}><DialogTitle>Nested details</DialogTitle><DialogContent><button id="nested-first" autoFocus>Details action</button><button id="nested-close" onClick={()=>setNested(false)}>Close details</button></DialogContent></Dialog>
  <Menu id="nested-menu" open={!!menu} anchorEl={menu} container={frameContainer} onClose={()=>setMenu(null)} transitionDuration={0}><MenuItem id="menu-choice" onClick={()=>setMenu(null)}>Weekly</MenuItem></Menu>
 </Dialog>
 </div></ThemeProvider></CacheProvider>;
}
export function mountFrame(){const frame=document.createElement('iframe');frame.id='dialog-frame';document.body.append(frame);const doc=frame.contentDocument;const host=doc.createElement('div');doc.body.append(host);const root=createRoot(host);root.render(<VariantScene frameContainer={doc.body}/>);window.removeFrame=()=>{root.unmount();frame.remove()};}
