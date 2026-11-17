import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {DialogTitle,DialogContent,DialogActions} from '@buttons';
import DialogContext from '@dialog-context';
import Dialog from '@dialog-control';
export function makeTheme({mode='light',variables=false,custom=false,rtl=false}={}){
 return createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,...(custom?{components:{
  MuiTypography:{styleOverrides:{h6:{letterSpacing:'.04em'}}},
  MuiDialogTitle:{defaultProps:{variant:'subtitle1'},styleOverrides:{root:{fontWeight:700}}},
  MuiDialogContent:{styleOverrides:{root:{paddingLeft:30},dividers:{borderTopWidth:2}}},
  MuiDialogActions:{styleOverrides:{root:{paddingBottom:12},spacing:{columnGap:2}}},
 }}:{})});
}
export function ContextScene({titleId='provided-title',id,component,variant}){return <DialogContext.Provider value={{titleId}}><DialogTitle id={id} component={component} variant={variant}>Confirm</DialogTitle></DialogContext.Provider>}
export function PanelScene({kind='confirmation'}){
 if(kind==='title')return <DialogTitle sx={{fontWeight:700,color:'#143353'}}>Welcome to WARML</DialogTitle>;
 return <section style={{display:'flex',flexDirection:'column'}}><DialogTitle>{kind==='contact'?'Contact WARML':'Leave this page?'}</DialogTitle><DialogContent sx={kind==='contact'?{display:'flex',flexDirection:'column',gap:2,pt:'1rem !important'}:undefined}>{kind==='contact'?<><label>Name<input defaultValue="Synthetic participant"/></label><label>Message<textarea defaultValue="Question about practice"/></label></>:<p>Open the external resource?</p>}</DialogContent><DialogActions><button>Cancel</button><button>Continue</button></DialogActions></section>;
}
const TitleRoot=React.forwardRef(function TitleRoot(props,ref){return <h3 {...props} ref={ref}/>});
export function VariantScene({mode='light',variables=false,custom=false,rtl=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,custom,rtl}),[mode,variables,custom,rtl]);
 const cache=React.useMemo(()=>createCache({key:rtl?'dialogrtl':'dialogltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [title,setTitle]=React.useState(true),[dividers,setDividers]=React.useState(false),[spacing,setSpacing]=React.useState(true),[overlay,setOverlay]=React.useState(false),[contextId,setContextId]=React.useState('context-title');
 const titleRef=React.useRef(),contentRef=React.useRef(),actionsRef=React.useRef();
 React.useEffect(()=>{window.dialogControls={setTitle,setDividers,setSpacing,setOverlay,setContextId,titleRef,contentRef,actionsRef}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="parts" dir={rtl?'rtl':'ltr'} data-tick={tick}>
 <section id="live" style={{display:'flex',flexDirection:'column',maxHeight:280,width:'min(100%, 420px)'}}>
 {title&&<DialogTitle id="live-title" component={TitleRoot} ref={titleRef} sx={{fontSize:'0.9rem'}}>Participant record</DialogTitle>}
 <DialogContent id="live-content" dividers={dividers} ref={contentRef}><label>Reminder<input id="focus" defaultValue="Retain my draft"/></label><div style={{height:500}}>Synthetic scrollable form</div></DialogContent>
 <DialogActions id="live-actions" disableSpacing={!spacing} ref={actionsRef}><button id="cancel">Cancel</button><style>{'.fixture-rule{color:inherit}'}</style><button id="save">Save</button></DialogActions>
 </section>
 <DialogContext.Provider value={{titleId:contextId}}><section role="dialog" aria-labelledby={contextId} id="label-dialog"><DialogTitle>Inherited heading</DialogTitle></section></DialogContext.Provider>
 <DialogContent id="without-title">No heading</DialogContent>
 <DialogContent id="divided" dividers classes={{root:'extra-content',dividers:'extra-dividers'}}>Content</DialogContent>
 <DialogActions id="wrapped" sx={{flexWrap:'wrap',gap:.5,px:2,pb:2}}>{['Same person','Parent and child','Form','Cancel'].map(label=><button key={label}>{label}</button>)}</DialogActions>
 <PanelScene kind="contact"/><PanelScene/>
 {/* The upstream Dialog is a test control only. Explicit labeling avoids pretending
     its private context is the independently owned Dialog context. */}
 <Dialog open={overlay} onClose={()=>setOverlay(false)} aria-labelledby="overlay-title" maxWidth="sm" fullWidth><DialogTitle id="overlay-title">Edit reminder</DialogTitle><DialogContent><label>Title<input id="overlay-input" autoFocus/></label></DialogContent><DialogActions><button id="overlay-close" onClick={()=>setOverlay(false)}>Close</button></DialogActions></Dialog>
 </div></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <ThemeProvider theme={makeTheme()}><section id="hydrated"><DialogContext.Provider value={{titleId:'hydrated-title'}}><DialogTitle>Reminder</DialogTitle><DialogContent><input defaultValue="Keep this draft"/></DialogContent><DialogActions><button>Save</button></DialogActions></DialogContext.Provider></section></ThemeProvider>}
