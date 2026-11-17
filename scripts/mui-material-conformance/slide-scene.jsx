import React from 'react';
import {createRoot} from 'react-dom/client';
import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {Slide,Dialog,DialogTitle,DialogContent} from '@buttons';
import {ThemeProvider,styled,useTheme} from '@integration';
import {createTheme} from '@mui/material/styles';
export function makeTheme({rtl=false,custom=false,reduced='never'}={}){return createTheme({direction:rtl?'rtl':'ltr',cssVariables:true,motion:{reducedMotion:reduced},components:custom?{MuiSlide:{defaultProps:{timeout:40,direction:'left'}}}:{}})}
const SettingsDialog=styled(Dialog)(({theme})=>({'& .MuiDialog-paper':{position:'fixed',width:380,maxWidth:'90vw',backgroundColor:theme.vars.palette.background.paper,top:0,height:'100%',minHeight:'100%',bottom:0,right:0,margin:0,zIndex:1000,borderRadius:0}}));
const ThemesDialog=styled(SettingsDialog)(({theme})=>({'& .MuiDialog-paper':{width:'100%',maxWidth:'40%',[theme.breakpoints.down('md')]:{maxWidth:'90%'}}}));
const PanelTransition=React.forwardRef(function PanelTransition(props,ref){const theme=useTheme();return <Slide direction={theme.direction==='ltr'?'left':'right'} ref={ref} {...props}/>});
export function PanelScene({kind='open'}){return <Slide in={kind!=='closed'} appear={kind!=='settled'} direction="left"><section style={{width:380}}><h2>Theme settings</h2><label>Label<input defaultValue="Synthetic theme"/></label><button>Save</button></section></Slide>}
export function HydrationScene(){return <ThemeProvider theme={makeTheme()}><Slide in appear={false}><div id="hydrated"><button>Theme settings</button></div></Slide></ThemeProvider>}
export function VariantScene({rtl=false,custom=false,reduced='never',tick=0,frameContainer}){
 const [open,setOpen]=React.useState(false),[mounted,setMounted]=React.useState(true),[config,setConfig]=React.useState({}),[dialog,setDialog]=React.useState(false),[panel,setPanel]=React.useState('themes');
 const ref=React.useRef(),childRef=React.useRef(),boundary=React.useRef(),events=React.useRef([]),ends=React.useRef([]);
 const {bounded=false,listener=false,translated=false,...options}=config;
 const callbacks=Object.fromEntries(['onEnter','onEntering','onEntered','onExit','onExiting','onExited'].map(name=>[name,(node,appearing)=>events.current.push({name,appearing,node:node===ref.current,transform:node.style.transform,duration:node.style.transitionDuration,curve:node.style.transitionTimingFunction})]));
 const theme=React.useMemo(()=>makeTheme({rtl,custom,reduced}),[rtl,custom,reduced]);
 const cache=React.useMemo(()=>createCache({key:rtl?'slidertl':'slideltr',container:frameContainer?.ownerDocument.head,stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const container=React.useCallback(()=>boundary.current,[]);
 React.useEffect(()=>{(frameContainer?.ownerDocument.defaultView||window).slideControls={setOpen,setMounted,setConfig,setDialog,setPanel,ref,childRef,boundary,events,ends}},[frameContainer]);
 const Component=panel==='settings'?SettingsDialog:ThemesDialog;
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="fixture" dir={rtl?'rtl':'ltr'} data-tick={tick}>
 <div id="boundary" ref={boundary} style={{position:'fixed',left:60,top:80,width:300,height:200}}/>
 {mounted&&<Slide ref={ref} in={open} timeout={60} {...options} container={bounded?container:undefined} {...callbacks} addEndListener={listener?(node,done)=>ends.current.push(done):undefined}><div id="live" ref={childRef} style={{position:'fixed',left:96,top:120,width:180,height:90,...(translated?{transform:'translate(15px, 20px)'}:{})}}><input id="draft" defaultValue="Keep this draft"/></div></Slide>}
 <button id="trigger" onClick={()=>setDialog(true)}>Open settings</button>
 <Component open={dialog} onClose={()=>setDialog(false)} transitionDuration={80} container={frameContainer} disableRestoreFocus {...(panel==='settings'?{TransitionComponent:PanelTransition}:{slots:{transition:PanelTransition},fullScreen:true})} slotProps={{backdrop:{invisible:true}}}>
  <DialogTitle>Theme settings</DialogTitle><DialogContent><input id="panel-draft" autoFocus defaultValue="Unsubmitted setting"/><button id="close" onClick={()=>setDialog(false)}>Close settings</button></DialogContent>
 </Component>
 </div></ThemeProvider></CacheProvider>;
}
export function mountFrame(){const frame=document.createElement('iframe');frame.id='slide-frame';document.body.append(frame);const doc=frame.contentDocument;const host=doc.createElement('div');doc.body.append(host);const root=createRoot(host);root.render(<VariantScene frameContainer={doc.body}/>);window.removeFrame=()=>{root.unmount();frame.remove()};}
