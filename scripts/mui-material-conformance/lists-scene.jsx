import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {List,MenuList,MenuItem,ListItemIcon,ListItemText,ListSubheader,Divider,SvgIcon} from '@buttons';
export function makeTheme({mode='light',rtl=false,variables=false,custom=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'}},...(custom?{components:{MuiMenuItem:{styleOverrides:{root:{borderRadius:4,padding:'6px 8px','& .MuiListItemIcon-root':{minWidth:24,'& svg':{fontSize:16}}}}},MuiList:{styleOverrides:{root:{padding:'4px 0'}}},MuiListItemText:{styleOverrides:{inset:{paddingLeft:24}}},MuiListItemIcon:{styleOverrides:{root:{minWidth:24,'& svg':{fontSize:16}}}}}}:{})});}
export function VariantScene({mode='light',rtl=false,variables=false,custom=false,dense=false,tick=0,disabledItemsFocusable=false,disableListWrap=false,autoFocusItem=false,variant='selectedMenu'}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]),cache=React.useMemo(()=>createCache({key:rtl?'menurtl':'menultr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const refs=React.useRef({}),[selected,setSelected]=React.useState('beta'),[events,setEvents]=React.useState([]);
 React.useEffect(()=>{window.menuControls={refs,setSelected,events}},[events]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><main id="variants" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20,fontFamily:'Arial',fontSize:16,width:300}}>
 <MenuList id="menu" aria-label="Contests" dense={dense} ref={n=>{refs.current.list=n}} autoFocusItem={autoFocusItem} variant={variant} disabledItemsFocusable={disabledItemsFocusable} disableListWrap={disableListWrap}>
 <ListSubheader id="header">Choose contest</ListSubheader>
 {['alpha','beta','blocked','bravo','charlie'].map(name=><MenuItem id={name} key={name} disabled={name==='blocked'} selected={selected===name} onClick={()=>{setSelected(name);setEvents(e=>[...e,name])}} ref={name==='alpha'?n=>{refs.current.alpha=n}:undefined}>
 <ListItemIcon><SvgIcon><path d="M2 2h20v20H2z"/></SvgIcon></ListItemIcon><ListItemText primary={name[0].toUpperCase()+name.slice(1)} secondary={name==='alpha'?'Contest details':undefined}/>
 </MenuItem>)}<Divider/><MenuItem id="link" component="a" href="#resource" divider disableGutters><ListItemText inset primary="Resource"/></MenuItem></MenuList>
 <List id="plain" dense={dense} subheader={<ListSubheader inset disableSticky color="primary">Quick settings</ListSubheader>}><ListItemIcon id="plain-icon">*</ListItemIcon><ListItemText id="plain-text" primary="Settings" secondary="Details"/></List>
 <form onSubmit={event=>{event.preventDefault();setEvents(e=>[...e,"submit"])}}><MenuList><MenuItem component="button" id="native-choice" onClick={()=>setEvents(e=>[...e,"native"])}>Native choice</MenuItem><MenuItem component="button" id="native-disabled" disabled onClick={()=>setEvents(e=>[...e,"disabled"])}>Disabled</MenuItem></MenuList></form><button id="outside">Outside</button></main></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <MenuList><MenuItem id="hydrate-item"><ListItemText primary="Contest"/></MenuItem></MenuList>}
const benchmarkTheme=makeTheme();
export function BenchScene({kind}){return <ThemeProvider theme={benchmarkTheme}>{kind==='text'?<List>{Array.from({length:12},(_,i)=><ListItemText key={i} primary={'Contest '+i} secondary="Details"/>)}</List>:<MenuList dense={kind==='dense'}>{Array.from({length:12},(_,i)=><MenuItem key={i} selected={i===2} disableRipple>{kind==='icons'?<ListItemIcon><SvgIcon><path d="M2 2h20v20H2z"/></SvgIcon></ListItemIcon>:null}<ListItemText primary={'Contest '+i}/></MenuItem>)}</MenuList>}</ThemeProvider>}
