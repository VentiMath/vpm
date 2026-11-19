import React from 'react';
import {createTheme} from '@mui/material/styles';import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';import {List,ListItemButton,ListItemIcon,ListItemText,SvgIcon} from '@buttons';
const Router=React.forwardRef(function Router({to,...props},ref){return <a {...props} href={to} ref={ref}/>});
export function makeTheme({mode='light',variables=false,rtl=false,custom=false}={}){return createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,...(custom?{components:{MuiListItemButton:{styleOverrides:{root:{padding:'6px 8px',minHeight:48,'&.Mui-selected':{borderRadius:6}}}},MuiListItemIcon:{styleOverrides:{root:{minWidth:24}}}}}:{})});}
export function ListButtonScene({mode='light',variables=false,rtl=false,custom=false,dense=false,parentDense=false,alignItems='center',disableGutters=false,divider=false,selected=false,disabled=false,autoFocus=false,tick=0}={}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,rtl,custom}),[mode,variables,rtl,custom]),cache=React.useMemo(()=>createCache({key:rtl?'lbrtl':'lbltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const ref=React.useRef(),[events,setEvents]=React.useState([]);React.useEffect(()=>{window.listButtonControls={ref,events}},[events]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="list-buttons" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20,width:320,fontFamily:'Arial'}}>
 <button id="before">Before</button><List component="nav" aria-label="Contests" dense={parentDense}>
 <ListItemButton id="sample" ref={ref} dense={dense} alignItems={alignItems} selected={selected} disabled={disabled} disableGutters={disableGutters} divider={divider} autoFocus={autoFocus} focusVisibleClassName="keyboard-ring" onClick={()=>setEvents(e=>[...e,'action'])} disableRipple><ListItemIcon id="icon"><SvgIcon><path d="M2 2h20v20H2z"/></SvgIcon></ListItemIcon><ListItemText id="text" primary="Contests" secondary="Current season"/></ListItemButton>
 <ListItemButton id="router" component={Router} to="#contest" onClick={e=>{e.preventDefault();setEvents(s=>[...s,'route'])}} disableRipple><ListItemText primary="Contest directory"/></ListItemButton>
 <ListItemButton id="blocked" disabled onClick={()=>setEvents(e=>[...e,'blocked'])} disableRipple>Unavailable</ListItemButton>
 <ListItemButton id="native" component="button" onClick={()=>setEvents(e=>[...e,'native'])} disableRipple>Native action</ListItemButton>
 </List><input id="after" aria-label="After"/></section></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <List component="nav"><ListItemButton id="hydrated" href="#contests" disableRipple><ListItemText primary="Contests"/></ListItemButton></List>}
