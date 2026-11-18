import React from 'react';
import {createTheme} from '@mui/material/styles';
import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';import {LinearProgress} from '@buttons';
import {useMaterialReactTable,MRT_LinearProgressBar} from '@table-caller';
const data=[{name:'Resource'}],columns=[{accessorKey:'name',header:'Resource'}];
export function makeTheme({mode='light',variables=false,rtl=false,custom=false}={}){return createTheme({direction:rtl?'rtl':'ltr',palette:{mode,contest:{main:'#336699'}},cssVariables:variables,...(custom?{components:{MuiLinearProgress:{styleOverrides:{root:{height:6,marginTop:3},bar1:{borderRadius:2},dashed:{backgroundSize:'12px 12px'}}}}}:{})});}
export function LinearScene({mode='light',variables=false,rtl=false,custom=false,color='primary',tick=0}={}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,rtl,custom}),[mode,variables,rtl,custom]),cache=React.useMemo(()=>createCache({key:rtl?'linearrtl':'linearltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [value,setValue]=React.useState(25),[loading,setLoading]=React.useState(false),[showProgressBars,setShowProgressBars]=React.useState(false),ref=React.useRef();
 const table=useMaterialReactTable({columns,data,state:{isLoading:loading,showProgressBars},muiLinearProgressProps:{color:'secondary',sx:{height:2}}});
 React.useEffect(()=>{window.linearControls={ref,setValue,setLoading,setShowProgressBars}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="bars" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{width:400,color:'rgb(40, 80, 120)'}}>
 <LinearProgress id="loading" ref={ref} color={color} aria-label="Loading exams" sx={{height:2,opacity:.6}}/>
 <LinearProgress id="capacity" variant="determinate" value={value} color={color} aria-label="Seat capacity" sx={{height:8,borderRadius:4}}/>
 <LinearProgress id="buffer" variant="buffer" value={value} valueBuffer={75} color={color}/>
 <LinearProgress id="query" variant="query" color={color}/>
 <LinearProgress id="inherit" color="inherit"/>
 <LinearProgress id="inherit-buffer" color="inherit" variant="buffer" value={value} valueBuffer={75}/>
 <div id="table-caller"><MRT_LinearProgressBar table={table} isTopToolbar/></div>
 <input id="draft" aria-label="Draft" defaultValue="Draft"/>
 </section></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <LinearProgress id="hydrated" variant="determinate" value={50} aria-label="Progress"/>;}
