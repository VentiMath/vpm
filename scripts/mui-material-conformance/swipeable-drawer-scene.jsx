import React from 'react';
import {createTheme} from '@mui/material/styles';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';
import {SwipeableDrawer as Drawer,Dialog,DialogTitle} from '@buttons';
export function makeTheme({mode='light',variables=false,rtl=false,custom=false}={}){return createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,...(custom?{components:{MuiDrawer:{styleOverrides:{docked:{flexShrink:0},paper:{padding:12},root:{'& .MuiDrawer-paper':{backgroundImage:'none'}}}}}}:{})});}
export function PanelScene({variant='permanent',open=true,anchor='left',keepMounted=false}){return <Drawer onOpen={()=>{}} onClose={()=>{}} variant={variant} open={open} anchor={anchor} ModalProps={{disablePortal:true,keepMounted}} sx={{'& .MuiPaper-root':{width:240}}} slotProps={{paper:{'aria-label':'Practice sidebar'}}}><input defaultValue="Retained practice filter"/><button>Practice</button></Drawer>}
export function VariantScene({mode='light',variables=false,rtl=false,custom=false,variant='temporary',anchor='left',keepMounted=false,disablePortal=false,disableEscapeKeyDown=false,disableScrollLock=false,disableAutoFocus=false,disableEnforceFocus=false,hideBackdrop=false,customSlots=false,iframe=false,tick=0,disableSwipeToOpen=true,disableDiscovery=false,disableBackdropTransition=false,scrollable=false,hold=false,externalPaperRef=true,legacyPaper=false,hysteresis=.52,minFlingVelocity=450,allowSwipeInChildren=false}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,rtl,custom}),[mode,variables,rtl,custom]);
 const cache=React.useMemo(()=>createCache({key:rtl?'drawerrtl':'drawerltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [open,setOpen]=React.useState(false),[nested,setNested]=React.useState(false),rootRef=React.useRef(),paperRef=React.useRef(),frameRef=React.useRef(),events=React.useRef([]);
 const paperProps={id:'drawer-paper',...(externalPaperRef?{ref:paperRef}:{}),'aria-label':'Practice navigation',style:{width:anchor==='left'||anchor==='right'?240:undefined,height:anchor==='top'||anchor==='bottom'?180:undefined},...(customSlots?{component:'section'}:{})};
 React.useEffect(()=>{window.drawerControls={setOpen,setNested,events,rootRef,paperRef,frameRef}},[]);
 const container=React.useCallback(()=>frameRef.current?.contentDocument.body,[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="scene" data-tick={tick} data-open={open} dir={rtl?'rtl':'ltr'}>
 <button id="trigger" onClick={()=>setOpen(true)}>Open practice</button><button id="outside">Outside</button>
 {iframe&&<iframe ref={frameRef} title="Synthetic drawer document" style={{width:500,height:350}}/>}
 <Drawer id="drawer-root" variant={variant} anchor={anchor} open={open} ref={rootRef} onOpen={()=>{events.current.push('swipeOpen');if(!hold)setOpen(true)}} onClose={(event,reason)=>{events.current.push(reason||'swipeClose');if(!hold)setOpen(false)}} disableSwipeToOpen={disableSwipeToOpen} disableDiscovery={disableDiscovery} disableBackdropTransition={disableBackdropTransition} hysteresis={hysteresis} minFlingVelocity={minFlingVelocity} allowSwipeInChildren={allowSwipeInChildren} transitionDuration={30}
 ModalProps={{keepMounted,disablePortal,disableEscapeKeyDown,disableScrollLock,disableAutoFocus,disableEnforceFocus,container:iframe?container:undefined}}
 {...(variant==='temporary'?{hideBackdrop}: {})}
 className="FusePageCarded-sidebarWrapper" classes={{paper:'FusePageCarded-sidebar'}}
 sx={{'& .MuiPaper-root':{width:anchor==='left'||anchor==='right'?240:undefined}}}
 {...(legacyPaper?{PaperProps:paperProps}:{})}
 slotProps={{swipeArea:{'data-testid':'swipe-area'},...(legacyPaper?{}:{paper:paperProps}),backdrop:{'data-testid':'backdrop',classes:{root:'app-backdrop'}},transition:{onEntered:()=>events.current.push('entered'),onExited:()=>events.current.push('exited')}}}>
 <div id="touch-surface" style={{height:40,flexShrink:0}}>Swipe panel</div>
 {scrollable&&<div id="touch-scroll" style={{height:80,flexShrink:0,overflow:'auto'}}><div style={{height:900,width:900}}>Scrollable synthetic navigation</div></div>}
 <input id="drawer-input" defaultValue="Keep practice filter"/><button id="drawer-last" onClick={()=>setNested(true)}>Details</button>
 </Drawer>
 <Dialog open={nested} transitionDuration={0} onClose={()=>setNested(false)}><DialogTitle>Nested details</DialogTitle><input id="nested-input"/><button id="nested-close" onClick={()=>setNested(false)}>Close</button></Dialog>
 </div></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <ThemeProvider theme={makeTheme()}><PanelScene/></ThemeProvider>}
