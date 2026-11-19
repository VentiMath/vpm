import React from 'react';
import {createTheme} from '@mui/material/styles';import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';import {AppBar,Toolbar} from '@buttons';
export function makeTheme({mode='light',variables=false,rtl=false,custom=false}={}){return createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,...(custom?{components:{MuiAppBar:{defaultProps:{enableColorOnDark:true,elevation:0},styleOverrides:{root:{borderBottom:'1px solid currentColor'}}},MuiToolbar:{styleOverrides:{root:{minHeight:48,'@media (min-width:600px)':{minHeight:48}},regular:{minHeight:48,'@media (min-width:600px)':{minHeight:48}},dense:{minHeight:40,'@media (min-width:600px)':{minHeight:40}}}}}}:{})});}
export function BarsScene({mode='light',variables=false,rtl=false,custom=false,variant='regular',disableGutters=false,color='primary',position='static',enableColorOnDark,component='header',shell=false,tick=0}={}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,rtl,custom}),[mode,variables,rtl,custom]),cache=React.useMemo(()=>createCache({key:rtl?'barsrtl':'barsltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const ref=React.useRef(),toolbarRef=React.useRef();React.useEffect(()=>{window.barsControls={ref,toolbarRef}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><main dir={rtl?'rtl':'ltr'} data-tick={tick} style={{color:'rgb(12,34,56)'}}>
 <AppBar id="sample" ref={ref} color={color} position={position} enableColorOnDark={enableColorOnDark} component={component} className={shell?'shell-bar':undefined} sx={shell?t=>({backgroundColor:(t.vars?.palette||t.palette).background.default,color:(t.vars?.palette||t.palette).text.primary}):undefined}>
 <Toolbar id="toolbar" ref={toolbarRef} variant={variant} disableGutters={disableGutters} className={shell?'shell-toolbar':undefined}><button id="first">Open navigation</button><span style={{flex:1}}>VentiMath</span><a id="last" href="#contests">Contests</a></Toolbar></AppBar>
 </main></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <AppBar position="static"><Toolbar id="hydrated"><a href="#contests">Contests</a></Toolbar></AppBar>}
