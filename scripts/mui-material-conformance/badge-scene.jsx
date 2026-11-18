import React from 'react';
import {createTheme} from '@mui/material/styles';import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';import {Badge,IconButton,SvgIcon,Tooltip} from '@buttons';
export function makeTheme({mode='light',variables=false,rtl=false,custom=false}={}){return createTheme({direction:rtl?'rtl':'ltr',palette:{mode,contest:{main:'#336699',contrastText:'#fff'}},cssVariables:variables,...(custom?{components:{MuiBadge:{styleOverrides:{root:{margin:4},badge:{fontWeight:600},colorError:{outline:'1px solid red'}}}}}:{})});}
export function BadgeScene({mode='light',variables=false,rtl=false,custom=false,color='error',overlap='rectangular',vertical='top',horizontal='right',variant='standard',tick=0}={}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,rtl,custom}),[mode,variables,rtl,custom]),cache=React.useMemo(()=>createCache({key:rtl?'badgertl':'badgeltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [count,setCount]=React.useState(5),[hidden,setHidden]=React.useState(false),[open,setOpen]=React.useState(false),ref=React.useRef(),slotRef=React.useRef();
 React.useEffect(()=>{window.badgeControls={ref,slotRef,setCount,setHidden,setOpen}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="badges" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:40,width:320}}>
 <Tooltip title="Reading list"><IconButton id="reading-list" aria-label={'Reading list, '+count+' items'} onClick={()=>setOpen(v=>!v)} disableRipple>
 <Badge id="sample" ref={ref} slotProps={{root:{ref:slotRef}}} badgeContent={count} invisible={hidden} color={color} overlap={overlap} variant={variant} anchorOrigin={{vertical,horizontal}}><SvgIcon><path d="M6 3 H18 V21 L12 17 L6 21 Z"/></SvgIcon></Badge>
 </IconButton></Tooltip>
 <Badge id="dot" variant="dot" color="secondary"><span style={{display:'block',width:24,height:24}}>B</span></Badge>
 {open&&<div id="reading-menu">Reading queue</div>}
 <input id="draft" aria-label="Draft" defaultValue="Draft"/>
 </section></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <Badge id="hydrated" badgeContent={5} color="error"><span>Reading list</span></Badge>;}
