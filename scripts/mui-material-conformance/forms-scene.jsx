import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {FormControl,FormLabel,FormHelperText,useFormControl} from '@buttons';
import InputBase from '@control-input';
import ControlContext from '@control-context';
// Test-only bridge: the unchanged control input consumes VPM's independent
// context. Neither upstream InputBase nor this bridge is shipped in VPM.
export function InputAdapter(props){const state=useFormControl();return <ControlContext.Provider value={state}><InputBase {...props}/></ControlContext.Provider>}
InputAdapter.muiName='Input';
export function makeTheme({mode='light',rtl=false,variables=false,custom=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'},secondary:{main:'#8b336e'}},...(custom?{components:{
 MuiFormControl:{defaultProps:{color:'secondary'},styleOverrides:{root:{'& > .MuiFormHelperText-root':{marginLeft:0}},marginDense:{paddingTop:2}},variants:[{props:{fullWidth:true},style:{borderRadius:3}}]},
 MuiFormLabel:{styleOverrides:{root:{fontSize:'0.75rem',fontWeight:500,lineHeight:2},asterisk:{fontWeight:700},filled:{textDecoration:'underline'}}},
 MuiFormHelperText:{styleOverrides:{root:{fontSize:'0.75rem'},contained:{paddingBottom:1}}}
 }}:{})});}
function Probe({id}){const state=useFormControl();return <output id={id}>{JSON.stringify(state)}</output>}
export function FormsScene({mode='light',rtl=false,variables=false,custom=false,disabled=false,error=false,focused,required=true,tick=0,mount=true}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]);
 const cache=React.useMemo(()=>createCache({key:rtl?'formsrtl':'formsltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const control=React.useRef(null),label=React.useRef(null),helper=React.useRef(null);
 const counts=React.useRef({focus:0,blur:0});
 React.useEffect(()=>{window.formControls={control,label,helper,counts};},[]);
 React.useEffect(()=>()=>cache.sheet.flush(),[cache]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="forms" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{fontFamily:'Arial',fontSize:16,padding:20,background:mode==='dark'?'#121212':'#fff'}}>
 {mount&&<FormControl id="control" ref={control} disabled={disabled} error={error} required={required} focused={focused} fullWidth margin="normal" onFocus={()=>counts.current.focus++} onBlur={()=>counts.current.blur++} sx={{maxWidth:{xs:280,sm:400},mb:2}}>
 <FormLabel id="label" ref={label} htmlFor="contest">Contest</FormLabel>
 <InputAdapter id="contest" aria-describedby="help"/>
 <FormHelperText id="help" ref={helper}>Enter the contest name</FormHelperText>
 <FormLabel id="explicit" disabled={false} error={false} required={false} focused={false}>Explicit</FormLabel>
 <Probe id="state"/>
 <FormControl id="nested" size="small" margin="dense" variant="standard"><FormLabel id="nested-label" htmlFor="nested-input">Round</FormLabel><InputAdapter id="nested-input" defaultValue="0" startAdornment={<span>$</span>}/><FormHelperText id="nested-help"> </FormHelperText><Probe id="nested-state"/></FormControl>
 </FormControl>}
 {['standard','outlined','filled'].map(variant=>['small','medium'].map(size=><FormControl key={variant+size} id={variant+'-'+size} variant={variant} size={size} margin="dense" error={error} disabled={disabled} required={required} focused={focused}>
 <FormLabel id={variant+'-'+size+'-label'}>Palette</FormLabel><FormHelperText id={variant+'-'+size+'-help'}>Choose a color</FormHelperText></FormControl>))}
 <FormLabel id="legend" component="legend" required>Palette settings</FormLabel><FormHelperText id="standalone">Optional</FormHelperText>
 <button id="outside">Outside</button>
 </section></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){const cache=React.useMemo(()=>createCache({key:'formhydrate'}),[]);React.useEffect(()=>()=>cache.sheet.flush(),[cache]);return <CacheProvider value={cache}><FormControl required size="small"><FormLabel htmlFor="hydrate-input">Contest</FormLabel><InputAdapter id="hydrate-input" defaultValue="AMC" aria-describedby="hydrate-help"/><FormHelperText id="hydrate-help">Required</FormHelperText><Probe id="hydrate-state"/></FormControl></CacheProvider>}
