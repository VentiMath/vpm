import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {FormControl,FormLabel,FormHelperText,useFormControl,InputBase} from '@buttons';
import {useForm,Controller} from '@hook-form';
export function makeTheme({mode='light',rtl=false,variables=false,custom=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'},secondary:{main:'#8b336e'}},...(custom?{components:{
 MuiFormControl:{defaultProps:{color:'secondary'},styleOverrides:{root:{'& > .MuiFormHelperText-root':{marginLeft:0}},marginDense:{paddingTop:2}},variants:[{props:{fullWidth:true},style:{borderRadius:3}}]},
 MuiFormLabel:{styleOverrides:{root:{fontSize:'0.75rem',fontWeight:500,lineHeight:2},asterisk:{fontWeight:700},filled:{textDecoration:'underline'}}},
 MuiFormHelperText:{styleOverrides:{root:{fontSize:'0.75rem'},contained:{paddingBottom:1}}}
 }}:{})});}
function Probe({id}){const state=useFormControl();return <output id={id}>{JSON.stringify(state)}</output>}
export function InputScene({mode='light',rtl=false,variables=false,custom=false,disabled=false,error=false,focused,required=true,tick=0,mount=true}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]);
 const cache=React.useMemo(()=>createCache({key:rtl?'formsrtl':'formsltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const control=React.useRef(null),label=React.useRef(null),helper=React.useRef(null);
 const counts=React.useRef({focus:0,blur:0});
 React.useEffect(()=>{window.formControls={control,label,helper,counts};},[]);

 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="forms" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{fontFamily:'Arial',fontSize:16,padding:20,background:mode==='dark'?'#121212':'#fff'}}>
 {mount&&<FormControl id="control" ref={control} disabled={disabled} error={error} required={required} focused={focused} fullWidth margin="normal" onFocus={()=>counts.current.focus++} onBlur={()=>counts.current.blur++} sx={{maxWidth:{xs:280,sm:400},mb:2}}>
 <FormLabel id="label" ref={label} htmlFor="contest">Contest</FormLabel>
 <InputBase id="contest" aria-describedby="help"/>
 <FormHelperText id="help" ref={helper}>Enter the contest name</FormHelperText>
 <FormLabel id="explicit" disabled={false} error={false} required={false} focused={false}>Explicit</FormLabel>
 <Probe id="state"/>
 <FormControl id="nested" size="small" margin="dense" variant="standard"><FormLabel id="nested-label" htmlFor="nested-input">Round</FormLabel><InputBase id="nested-input" defaultValue="0" startAdornment={<span>$</span>}/><FormHelperText id="nested-help"> </FormHelperText><Probe id="nested-state"/></FormControl>
 </FormControl>}
 {['standard','outlined','filled'].map(variant=>['small','medium'].map(size=><FormControl key={variant+size} id={variant+'-'+size} variant={variant} size={size} margin="dense" error={error} disabled={disabled} required={required} focused={focused}>
 <FormLabel id={variant+'-'+size+'-label'}>Palette</FormLabel><FormHelperText id={variant+'-'+size+'-help'}>Choose a color</FormHelperText></FormControl>))}
 <FormLabel id="legend" component="legend" required>Palette settings</FormLabel><FormHelperText id="standalone">Optional</FormHelperText>
 <InputCases/><button id="outside">Outside</button>
 </section></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){const cache=React.useMemo(()=>createCache({key:'formhydrate'}),[]);return <CacheProvider value={cache}><FormControl required size="small"><FormLabel htmlFor="hydrate-input">Contest</FormLabel><InputBase id="hydrate-input" defaultValue="AMC" aria-describedby="hydrate-help"/><FormHelperText id="hydrate-help">Required</FormHelperText><Probe id="hydrate-state"/></FormControl></CacheProvider>}

const CustomInput=React.forwardRef(function CustomInput({ownerState,as,...props},ref){return <input {...props} ref={ref} data-custom="true"/>});
function InputCases(){
 const [text,setText]=React.useState('initial'),[narrow,setNarrow]=React.useState(false),[disabled,setDisabled]=React.useState(false),[shown,setShown]=React.useState(true),[alternateRoot,setAlternateRoot]=React.useState(false);
 const refs=React.useRef({}),events=React.useRef([]);const savedRef=React.useCallback(node=>{refs.current.callback=node;return()=>{refs.current.callback=null;events.current.push('cleanup');}},[]);
 const form=useForm({defaultValues:{number:0,notes:'one\ntwo'}});
 React.useEffect(()=>{window.inputCases={refs,events,setText,setNarrow,setDisabled,setShown,setAlternateRoot,form};},[form]);
 return <section id="inputcases" style={{width:narrow?140:320}}>
 <InputBase id="controlled" value={text} onChange={e=>{events.current.push('top-change');setText(e.target.value)}} inputProps={{onChange:()=>events.current.push('input-change')}} inputRef={node=>{refs.current.controlled=node}} aria-label="Controlled"/>
 <InputBase id="auto" slots={alternateRoot?{root:"section"}:undefined} multiline minRows={2} maxRows={4} fullWidth value={text} onChange={e=>setText(e.target.value)} aria-label="Notes"/>
 <InputBase id="fixed" multiline rows={3} defaultValue={'a\nb\nc\nd\ne'} aria-label="Fixed"/>
 <InputBase id="placeholder" multiline minRows={2} maxRows={3} fullWidth placeholder="Describe the contest and your travel arrangements" aria-label="Placeholder"/>
 <Controller name="number" control={form.control} render={({field:{ref,...field}})=><InputBase {...field} id="number" inputRef={ref} type="number" inputProps={{min:0,max:100,step:1}} aria-label="Count"/>}/>
 <Controller name="notes" control={form.control} render={({field:{ref,...field}})=><InputBase {...field} id="rhf-notes" multiline minRows={2} inputRef={ref} aria-label="Travel notes"/>}/>
 {shown&&<InputBase id="custom-field" inputComponent={CustomInput} inputRef={savedRef} disabled={disabled} defaultValue="custom" aria-label="Custom" onFocus={()=>events.current.push('focus')} onBlur={()=>events.current.push('blur')}/>}
 <InputBase id="slot-field" slots={{input:CustomInput}} slotProps={{root:{'data-slot-root':'yes'},input:{'aria-label':'Slot input',maxLength:12}}} endAdornment={<button id="adornment" type="button">Action</button>}/>
 <InputBase id="search-field" type="search" size="small" placeholder="Search" readOnly aria-label="Read-only search"/>
 <InputBase id="required-field" required inputProps={{pattern:'[0-9]+',onInvalid:()=>events.current.push('input-invalid')}} aria-label="Required digits" onInvalid={()=>events.current.push('invalid')}/>
 <InputBase id="autofill-field" aria-label="Autofill"/>
 </section>;
}

export function ForeignScene({doc}){const cache=React.useMemo(()=>createCache({key:'foreigninput',container:doc.head}),[doc]);return <CacheProvider value={cache}><InputBase id="foreign" multiline minRows={2} maxRows={3} fullWidth defaultValue={'one\ntwo\nthree\nfour'} inputProps={{'aria-label':'Foreign notes'}}/></CacheProvider>}
