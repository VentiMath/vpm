import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Input,OutlinedInput,FormControl,InputLabel,FormHelperText,InputAdornment,useFormControl} from '@buttons';
import {Controller,useForm} from '@hook-form';
export function makeTheme({mode='light',rtl=false,variables=false,custom=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'},secondary:{main:'#8b336e'}},...(custom?{components:{
 MuiFormControl:{defaultProps:{color:'secondary'}},MuiFormLabel:{styleOverrides:{root:{fontSize:12,fontWeight:500,lineHeight:2}}},MuiInputLabel:{defaultProps:{color:'secondary'},styleOverrides:{root:{transform:'translate(0, 4px) scale(1)','&.MuiInputLabel-shrink':{transform:'translate(0, -10px) scale(0.8)'},'&.MuiInputLabel-outlined, &.MuiInputLabel-filled':{transform:'translate(12px, 4px) scale(1)','&.MuiInputLabel-shrink':{transform:'translate(12px, -10px) scale(0.8)'}}}}},MuiInputAdornment:{styleOverrides:{filled:{lineHeight:1}}},MuiFormHelperText:{styleOverrides:{root:{marginLeft:0}}},
 MuiInputBase:{styleOverrides:{root:{'& > textarea':{padding:0}}}},
 MuiOutlinedInput:{defaultProps:{color:'secondary'},styleOverrides:{root:{height:'auto!important',minHeight:32,'&.MuiInputBase-sizeSmall':{minHeight:28}},input:{padding:'6px 12px'},inputSizeSmall:{padding:'4px 12px'},multiline:{padding:'6px 12px'},adornedStart:{paddingLeft:8},inputAdornedStart:{paddingLeft:8},adornedEnd:{paddingRight:8},inputAdornedEnd:{paddingRight:8}}},
 MuiInput:{styleOverrides:{root:{fontWeight:500},underline:{'&::before':{borderBottomWidth:2}}}}
 }}:{})});}
function Probe({id}){const s=useFormControl();return <output id={id}>{JSON.stringify({focused:s.focused,filled:s.filled,adornedStart:s.adornedStart})}</output>}
export function VariantScene({mode='light',rtl=false,variables=false,custom=false,disabled=false,error=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]);
 const cache=React.useMemo(()=>createCache({key:rtl?'variantrtl':'variantltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const refs=React.useRef({}),form=useForm({defaultValues:{number:0,notes:'one\ntwo'}}),[value,setValue]=React.useState('');
 React.useEffect(()=>{window.variantControls={refs,form,setValue}},[form]);// The fixture cache lives with this document; StrictMode effect replay must not flush live styles.

 return <CacheProvider value={cache}><ThemeProvider theme={theme}><main id="variants" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20,fontFamily:'Arial',fontSize:16}}>
 {[['standard',Input],['outlined',OutlinedInput]].map(([kind,Field])=><section key={kind} style={{width:280}}>
 <FormControl required disabled={disabled} error={error} variant={kind==='standard'?'standard':'outlined'} fullWidth><InputLabel ref={node=>{refs.current[kind+"Label"]=node}} htmlFor={kind}>Contest</InputLabel><Field id={kind} label={kind==='outlined'?'Contest':undefined} value={value} onChange={e=>setValue(e.target.value)} inputRef={node=>{refs.current[kind]=node}} aria-describedby={kind+'-help'}/><FormHelperText id={kind+'-help'}>Choose a contest</FormHelperText><Probe id={kind+'-state'}/></FormControl>
 <Field id={kind+'-small'} size="small" label={kind==='outlined'?'Fee':undefined} startAdornment={<InputAdornment ref={node=>{refs.current[kind+"Adornment"]=node}} position="start" disablePointerEvents>$</InputAdornment>} endAdornment={<InputAdornment position="end"><button aria-label="Show fee">kg</button></InputAdornment>} defaultValue="12" disabled={disabled} error={error}/>
 <Field id={kind+'-notes'} multiline minRows={2} maxRows={4} label={kind==='outlined'?'Notes':undefined} defaultValue={'one\ntwo\nthree'} fullWidth disabled={disabled}/>
 <Field id={kind+'-plain'} disableUnderline={kind==='standard'?true:undefined} notched={false} label={kind==='outlined'?'Closed':undefined} defaultValue="fixed"/>
 </section>)}
 <Controller name="number" control={form.control} render={({field:{ref,...field}})=><FormControl required><InputLabel htmlFor="number">Number</InputLabel><OutlinedInput {...field} id="number" inputRef={ref} type="number" size="small" label="Number" inputProps={{min:0,max:100}}/><Probe id="number-state"/></FormControl>}/>
 <Controller name="notes" control={form.control} render={({field:{ref,...field}})=><OutlinedInput {...field} id="rhf-notes" inputRef={ref} multiline minRows={2} label="Travel"/>}/>
 <OutlinedInput id="slot" label="Custom" notched slotProps={{notchedOutline:s=>({'data-outline':s.label,className:'app-outline'})}}/>
 <FormControl variant="filled" hiddenLabel size="small"><InputAdornment id="isolated" position="start"><output id="context-isolation"><Isolated/></output></InputAdornment></FormControl>
 <InputLabel id="plain-label" disableAnimation component="span" shrink={false}>Plain</InputLabel>
 <button id="outside">Outside</button>
 </main></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <FormControl required><InputLabel htmlFor="hydrated">Contest</InputLabel><OutlinedInput id="hydrated" label="Contest" defaultValue="AMC"/></FormControl>}

function Isolated(){return useFormControl()==null?"isolated":"leaked"}
