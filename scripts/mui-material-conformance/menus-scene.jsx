import React from 'react';
import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';import {Menu,Popover,MenuItem,ListItemIcon,ListItemText,SvgIcon} from '@buttons';
import {makeTheme as listTheme} from './lists-scene.jsx';
export function makeTheme(p){const t=listTheme(p);if(p?.custom){t.components.MuiMenu={styleOverrides:{paper:{padding:'0 4px',borderRadius:6},list:{display:'grid',gap:2}}};}return t;}
export function VariantScene({mode='light',rtl=false,variables=false,custom=false,tick=0,kind='menu',position=false,disablePortal=false,keepMounted=false,disableScrollLock=false,frame=false}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]),cache=React.useMemo(()=>createCache({key:rtl?'poprtl':'popltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [anchor,setAnchor]=React.useState(null),[open,setOpen]=React.useState(false),[events,setEvents]=React.useState([]),[nested,setNested]=React.useState(false),action=React.useRef(null),refs=React.useRef({});
 React.useEffect(()=>{window.popupControls={open,setOpen,action,refs,events,setNested}},[events,open]);
 const close=(e,reason)=>{setEvents(s=>[...s,reason]);setOpen(false)};
 const Popup=kind==='menu'?Menu:Popover;
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><main dir={rtl?'rtl':'ltr'} data-tick={tick} style={{fontFamily:'Arial'}}>
 <button id="trigger" style={{position:'absolute',top:100,left:240,width:120,height:40}} onClick={e=>{setAnchor(e.currentTarget);setOpen(true)}}>Schedule</button><button id="outside">Outside</button>
 <Popup id="popup" ref={node=>{refs.current.root=node}} action={action} open={open} anchorEl={anchor} onClose={close} disablePortal={disablePortal} keepMounted={keepMounted} disableScrollLock={disableScrollLock} transitionDuration={0} {...(position?{anchorReference:'anchorPosition',anchorPosition:{top:160,left:320},anchorOrigin:{vertical:'center',horizontal:'center'},transformOrigin:{vertical:'center',horizontal:'center'}}:{})} slotProps={{paper:{'data-paper':'main',style:{width:220}},...(kind==='menu'?{list:{'aria-label':'Schedule'}}:{})}}>
 {kind==='menu'?['once','blocked','weekly'].map((name,i)=><MenuItem key={name} id={'choice-'+name} disabled={name==='blocked'} selected={name==='weekly'} onClick={()=>{setEvents(s=>[...s,name]);setOpen(false)}}><ListItemIcon><SvgIcon><path d="M2 2h20v20H2z"/></SvgIcon></ListItemIcon><ListItemText primary={name}/></MenuItem>):<div style={{padding:16}}><button id="pop-first">First</button><button id="pop-last" onClick={()=>setNested(true)}>Nested</button><Popover id="nested-popup" open={nested} anchorEl={()=>refs.current.root?.querySelector('#pop-last')} onClose={()=>setNested(false)} transitionDuration={0}><button id="nested-choice">Nested choice</button></Popover></div>}
 </Popup></main></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <Menu open={false}><MenuItem>Contest</MenuItem></Menu>}
const benchmarkTheme=makeTheme();
export function BenchScene({kind}){return <ThemeProvider theme={benchmarkTheme}>{Array.from({length:12},(_,i)=>kind==='menu'?<Menu key={i} open={false}><MenuItem>Contest {i}</MenuItem></Menu>:<Popover key={i} open={false}>Contest {i}</Popover>)}</ThemeProvider>}
export function IframeScene({doc}){
 const cache=React.useMemo(()=>createCache({key:'frame-menu',container:doc.head}),[doc]);const [anchor,setAnchor]=React.useState(null),[open,setOpen]=React.useState(false);
 return <CacheProvider value={cache}><ThemeProvider theme={makeTheme()}><button id="frame-trigger" onClick={e=>{setAnchor(e.currentTarget);setOpen(true)}}>Frame menu</button><Menu id="frame-popup" anchorEl={anchor} open={open} onClose={()=>setOpen(false)} transitionDuration={0}><MenuItem id="frame-choice" onClick={()=>setOpen(false)}>Contest</MenuItem></Menu></ThemeProvider></CacheProvider>;
}
