import React from 'react';
import {createTheme} from '@mui/material/styles';import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';import {AccordionSummary,AccordionDetails} from '@buttons';import Context from '@context';
const AlternateContent=React.forwardRef(function AlternateContent({ownerState,...props},ref){return <em {...props} ref={ref} data-expanded={String(ownerState.expanded)}/>});
export function AccordionPartsScene({mode='light',variables=false,rtl=false,custom=false,expanded=false,disabled=false,disableGutters=false,icon=true,app=false,slots=false,component='button',slotClick=false,tick=0,standalone=false}={}){
 const [open,setOpen]=React.useState(expanded);React.useEffect(()=>setOpen(expanded),[expanded]);
 const theme=React.useMemo(()=>createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,...(custom?{components:{MuiAccordionSummary:{styleOverrides:{root:{border:'1px solid red'},content:{fontWeight:700},expandIconWrapper:{color:'#136789'}}},MuiAccordionDetails:{styleOverrides:{root:{paddingTop:11}}}}}:{})}),[mode,variables,rtl,custom]);
 const cache=React.useMemo(()=>createCache({key:rtl?'accordrtl':'accordltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const summary=React.useRef(),details=React.useRef(),content=React.useRef(),slotRoot=React.useRef();
 React.useEffect(()=>{window.accordionControls={summary,details,content,slotRoot}},[]);
 const context=standalone?{}:{expanded:open,disabled,disableGutters,toggle:event=>{window.events?.push('toggle');setOpen(x=>!x)}};
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><main dir={rtl?'rtl':'ltr'} data-tick={tick}><button id="before">Before</button><Context.Provider value={context}>
 <AccordionSummary id="summary" aria-controls="details" ref={summary} component={component} onClick={()=>window.events?.push('click')} expandIcon={icon?<span aria-hidden="true">⌄</span>:undefined} classes={{focusVisible:'custom-focus'}} slots={slots?{content:AlternateContent}:undefined} slotProps={slots?{root:{ref:slotRoot,'data-slot':'root',...(slotClick?{onClick:()=>window.events?.push('slot')}:{} )},content:state=>({ref:content,'data-state':String(state.expanded)}),expandIconWrapper:state=>({'data-expanded':String(state.expanded)})}:undefined} sx={app?{minHeight:36,'& .MuiAccordionSummary-content':{my:.5}}:undefined}>Contest information</AccordionSummary>
 <AccordionDetails id="details" role="region" aria-labelledby="summary" ref={details} sx={app?{pt:0}:undefined}><input id="inside" defaultValue="unchanged"/><span>WARML registration and HMMT results</span></AccordionDetails>
 </Context.Provider><a id="after" href="#next">After</a></main></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <Context.Provider value={{expanded:true}}><AccordionSummary id="hydrated" aria-controls="details">Contest information</AccordionSummary><AccordionDetails id="details">Details</AccordionDetails></Context.Provider>}
