import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Skeleton,Box,Typography} from '@buttons';
export function makeTheme({mode='light',variables=false,custom=false,rtl=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode},...(custom?{shape:{borderRadius:8},components:{MuiSkeleton:{defaultProps:{animation:'wave'},styleOverrides:{root:{margin:2},rounded:{border:'1px solid currentColor'}}}}}:{})})}
// Mirrors the component props in FuseLoading, WARML practice and contest archives.
export function LoadingScene({kind='archive'}){
 if(kind==='archive')return <Box>{[150,112,96,132,56,64,140,160].map((height,i)=><Skeleton key={i} variant="rounded" height={height}/>)}</Box>;
 if(kind==='signup')return <Box>{Array.from({length:8},(_,i)=><Skeleton key={i} variant="text" width={`${60+((i*7)%30)}%`} height={18} sx={{mb:.5}}/>)}</Box>;
 return <Box><Skeleton variant="text" width="40%" height={48} sx={{mb:2}}/><Skeleton variant="text" width="80%" height={20} sx={{mb:3}}/>{[0,1,2].map(i=><Skeleton key={i} variant="rectangular" height={80} sx={{mb:2,borderRadius:1}}/>)}</Box>;
}
export function VariantScene({mode='light',variables=false,custom=false,rtl=false,tick=0,wide=true}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,custom,rtl}),[mode,variables,custom,rtl]),cache=React.useMemo(()=>createCache({key:rtl?'skeletonrtl':'skeletonltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [width,setWidth]=React.useState(80),ref=React.useRef(null);
 React.useEffect(()=>{window.skeletonControls={setWidth,ref}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="skeletons" data-tick={tick} dir={rtl?'rtl':'ltr'} style={{width:wide?720:280}}>
 <button id="outside">Outside</button><div role="status" aria-label="Loading archive" aria-busy="true"><LoadingScene kind="fuse"/></div>
 <Skeleton id="sized" ref={ref} width={width} height={40} variant="rounded"/>
 <Skeleton id="pulse" animation="pulse"/><Skeleton id="wave" animation="wave" variant="rectangular" height={50}/>
 <Skeleton id="stopped" animation={false} variant="circular" width={36} height={36}/>
 <Skeleton id="measure" animation={false}><Typography component="span" sx={{fontSize:24}}>Measure text</Typography></Skeleton>
 <Skeleton id="hidden-button" animation={false}><button>Placeholder action</button></Skeleton>
 <Skeleton id="text-child" animation={false}>Private placeholder text</Skeleton>
 <Skeleton id="zero" animation={false}>{0}</Skeleton>
 <Skeleton id="custom" component="article" variant="rounded" width="80%" height={30} sx={{borderRadius:2}}/>
 <button id="after">After</button>
 </div></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <Skeleton id="hydrated" variant="rounded" width="70%" height={112}/>}
