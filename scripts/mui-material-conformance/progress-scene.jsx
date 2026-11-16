import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {CircularProgress,Button} from '@buttons';
export function makeTheme({mode='light',variables=false,custom=false,rtl=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode},...(custom?{components:{MuiCircularProgress:{defaultProps:{size:24},styleOverrides:{root:{margin:4},circle:{strokeLinecap:'round'}}}}}:{})})}
export function VariantScene({mode='light',variables=false,custom=false,rtl=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,custom,rtl}),[mode,variables,custom,rtl]),cache=React.useMemo(()=>createCache({key:rtl?'progressrtl':'progressltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [value,setValue]=React.useState(25),ref=React.useRef(null);
 React.useEffect(()=>{window.progressControls={setValue,ref}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="progresses" data-tick={tick} dir={rtl?'rtl':'ltr'}>
 <CircularProgress id="loading" aria-label="Loading exams" ref={ref}/>
 <Button id="submit" disabled><CircularProgress id="saving" size={20} color="inherit" aria-label="Saving response"/></Button>
 <CircularProgress id="determinate" variant="determinate" value={value} aria-label="Results loaded"/>
 <CircularProgress id="shrink-disabled" disableShrink size="2rem" color="secondary"/>
 <CircularProgress id="styled" color="error" size={24} thickness={5} sx={{width:32,height:32}}/>
 </div></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <CircularProgress id="hydrated" variant="determinate" value={50} aria-label="Progress"/>}
