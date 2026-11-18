import React from 'react';
import {createTheme} from '@mui/material/styles';
import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';import {Alert,AlertTitle} from '@buttons';
import {useMaterialReactTable,MRT_ToolbarAlertBanner} from '@table-caller';
const data=[{id:'one',name:'Resource one'},{id:'two',name:'Resource two'}],columns=[{accessorKey:'name',header:'Resource'}];
export function makeTheme({mode='light',variables=false,rtl=false,custom=false,legacy=false}={}){return createTheme({direction:rtl?'rtl':'ltr',palette:{mode,contest:{light:'#6699cc',main:'#336699',dark:'#113355',contrastText:'#fff'}},cssVariables:variables,...(custom?{components:{MuiAlert:{styleOverrides:{root:({ownerState:s})=>({padding:'12px 16px',borderRadius:8,...(!legacy&&(s.color||s.severity)==='info'&&s.variant==='standard'?{border:'1px solid var(--mui-palette-info-main)',color:'var(--mui-palette-info-main)'}:{})}),icon:{padding:'2px 0',fontSize:16},message:{padding:0},...(legacy?{standardInfo:{border:'1px solid var(--mui-palette-info-main)',color:'var(--mui-palette-info-main)'}}:{})}},MuiAlertTitle:{styleOverrides:{root:{letterSpacing:'.02em'}}}}}:{})});}
export function AlertScene({mode='light',variables=false,rtl=false,custom=false,legacy=false,severity='info',variant='standard',color,tick=0}={}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,rtl,custom,legacy}),[mode,variables,rtl,custom,legacy]),cache=React.useMemo(()=>createCache({key:rtl?'alertrtl':'alertltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [closed,setClosed]=React.useState(false),[rowSelection,setSelected]=React.useState({}),[showAlertBanner,setShow]=React.useState(false),ref=React.useRef(),slotRef=React.useRef();
 const table=useMaterialReactTable({columns,data,getRowId:r=>r.id,enableRowSelection:true,state:{rowSelection,showAlertBanner},onRowSelectionChange:setSelected,muiToolbarAlertBannerProps:{children:'Could not load resources',sx:{mt:2}}});
 React.useEffect(()=>{window.alertControls={ref,slotRef,setSelected,setShow,setClosed,table}},[table]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="alerts" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{width:480}}>
 <Alert id="sample" ref={ref} severity={severity} color={color} variant={variant} sx={{mb:2}}><AlertTitle>Practice capacity</AlertTitle>24 of 20 seats filled.</Alert>
 <Alert id="multiline" severity="warning" sx={{'& .MuiAlert-message':{whiteSpace:'pre-wrap'}}}>{'Check the first room.\nThe second room is open.'}</Alert>
 {!closed&&<Alert id="closeable" severity="error" onClose={()=>setClosed(true)} closeText="Dismiss notice" slotProps={{root:{ref:slotRef}}}>Could not load travelers.</Alert>}
 <Alert id="action" severity="info" action={<button id="retry" onClick={()=>{window.retryCount=(window.retryCount||0)+1}}>Retry</button>}>Try again.</Alert>
 <div id="table-caller"><MRT_ToolbarAlertBanner table={table}/></div>
 <input id="draft" aria-label="Draft" defaultValue="Draft"/>
 </section></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <Alert id="hydrated" severity="warning"><AlertTitle>Seats</AlertTitle>Capacity is limited.</Alert>;}
