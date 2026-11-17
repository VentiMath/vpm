import React from 'react';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Tooltip} from '@buttons';
export function PanelScene({kind='navigation'}){return <>{Array.from({length:kind==='navigation'?8:1},(_,i)=><Tooltip key={i} title={kind==='copy'?'Copied!':'Open contest '+i} open={kind==='copy'?true:undefined} arrow={kind==='copy'} slotProps={kind==='copy'?{popper:{placement:'top'}}:undefined}><button>Contest {i}</button></Tooltip>)}</>}
export function HydrationScene(){return <Tooltip title="Reading list"><button id="hydrated">Read</button></Tooltip>}
export function VariantScene({mode='light',variables=false,custom=false,tick=0,rtl=false}){
 const theme=React.useMemo(()=>createTheme({palette:{mode},cssVariables:variables,direction:rtl?'rtl':'ltr',components:custom?{MuiTooltip:{styleOverrides:{tooltip:{fontSize:'0.75rem',padding:'6px 10px',borderRadius:6}}}}:{}}),[mode,variables,custom,rtl]);
 const [options,setOptions]=React.useState({}),ref=React.useRef(null),childRef=React.useRef(null),[mounted,setMounted]=React.useState(true);
 React.useEffect(()=>{window.tooltipControls={setOptions,setMounted,ref,childRef,events:[]}},[]);
 return <ThemeProvider theme={theme}><div data-tick={tick} data-options={JSON.stringify(options)} dir={rtl?'rtl':'ltr'} style={{padding:120}}><button id="before">Before</button>{mounted&&<Tooltip key={options.open===undefined?"uncontrolled":"controlled"} ref={ref} title="Copied!" id="tip" enterDelay={40} leaveDelay={30} enterTouchDelay={50} leaveTouchDelay={70} onOpen={()=>window.tooltipControls.events.push('open')} onClose={()=>window.tooltipControls.events.push('close')} {...options}><button ref={childRef} id="trigger" style={{margin:30}}>Reference</button></Tooltip>}<button id="after">After</button></div></ThemeProvider>
}
