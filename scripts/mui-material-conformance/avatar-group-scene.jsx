import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Avatar,AvatarGroup} from '@buttons';
export function makeTheme({mode='light',variables=false,custom=false,rtl=false}={}){return createTheme({palette:{mode},cssVariables:variables,direction:rtl?'rtl':'ltr',components:custom?{MuiAvatar:{styleOverrides:{root:{width:36,height:36,fontSize:13}}},MuiAvatarGroup:{defaultProps:{spacing:'small'},styleOverrides:{root:{padding:2},avatar:{borderWidth:3}}}}:{}})}
export function PanelScene({kind='community'}){return <AvatarGroup max={kind==='surplus'?3:5} total={kind==='surplus'?25:undefined} sx={{'& .MuiAvatar-root':{borderColor:'primary.main'}}}>{['A','B','C','D'].map(label=><Avatar key={label}>{label}</Avatar>)}</AvatarGroup>}
export function HydrationScene(){return <AvatarGroup id="hydrated" max={3}>{['A','B','C','D'].map(label=><Avatar key={label}>{label}</Avatar>)}</AvatarGroup>}
export function VariantScene({mode='light',variables=false,custom=false,rtl=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,custom,rtl}),[mode,variables,custom,rtl]),cache=React.useMemo(()=>createCache({key:rtl?'grouprtl':'groupltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [labels,setLabels]=React.useState(['A','B','C','D']),[max,setMax]=React.useState(3),ref=React.useRef(null),childRef=React.useRef(null),surplusRef=React.useRef(null);
 React.useEffect(()=>{window.groupControls={ref,childRef,surplusRef,setLabels,setMax}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="groups" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{width:'80%',margin:'auto'}}>
 <PanelScene/><PanelScene kind="surplus"/>
 {['small','medium',0,4,12].map(spacing=><AvatarGroup key={spacing} spacing={spacing} max={3} variant="rounded">{['A','B','C','D'].map(label=><Avatar key={label} variant={label==='A'?'square':undefined}>{label}</Avatar>)}</AvatarGroup>)}
 <AvatarGroup id="live" ref={ref} component="section" max={max} slotProps={{surplus:{ref:surplusRef,'aria-label':'Additional members'}}} renderSurplus={n=><span>{n} more</span>}>{labels.map(label=><Avatar key={label} ref={label==='A'?childRef:undefined} id={'member-'+label} component="button" type="button">{label}</Avatar>)}</AvatarGroup>
 </div></ThemeProvider></CacheProvider>
}
