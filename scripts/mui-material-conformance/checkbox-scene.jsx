import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Checkbox,FormControlLabel,FormControl,FormHelperText,Typography,useFormControl} from '@buttons';
import {Controller,useForm} from '@hook-form';
import Radio from '@control-radio';
import Switch from '@control-switch';
export function makeTheme({mode='light',rtl=false,variables=false,custom=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'},secondary:{main:'#8b336e'}},...(custom?{components:{MuiCheckbox:{defaultProps:{color:'secondary'},styleOverrides:{root:{borderRadius:4},sizeSmall:{padding:8}}},MuiFormControlLabel:{styleOverrides:{root:{marginTop:2},label:{fontWeight:500},asterisk:{fontWeight:700}}}}}:{})});}
function State(){const state=useFormControl();return <output id="form-state">{JSON.stringify({focused:state.focused,disabled:state.disabled})}</output>}
export function VariantScene({mode='light',rtl=false,variables=false,custom=false,disabled=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]),cache=React.useMemo(()=>createCache({key:rtl?'checkrtl':'checkltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [checked,setChecked]=React.useState(false),[rows,setRows]=React.useState([false,false,true]),events=React.useRef([]),refs=React.useRef({}),form=useForm({defaultValues:{interest:false,remember:false}});
 React.useEffect(()=>{window.checkControls={setChecked,setRows,events,refs,form};},[form]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><form id="checks" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20,fontFamily:'Arial'}} onSubmit={e=>e.preventDefault()}>
 <FormControl disabled={disabled} error><FormControlLabel id="interest-label" required control={<Checkbox id="interest" name="interest" checked={checked} onChange={(e,v)=>{events.current.push([e.target.checked,v,e.target.name]);setChecked(v)}} slotProps={{input:{ref:n=>{refs.current.input=n}}}} ref={n=>{refs.current.root=n}}/>} label="Join local ARML"/><FormHelperText id="help">Confirm your interest</FormHelperText><State/></FormControl>
 <FormControlLabel id="uncontrolled-label" control={<Checkbox id="uncontrolled" name="uncontrolled" defaultChecked/>} label="Uncontrolled"/>
 <Controller name="interest" control={form.control} render={({field:{ref,...field}})=><FormControlLabel label="WARML interest" control={<Checkbox {...field} id="rhf" checked={field.value} slotProps={{input:{ref}}} onChange={e=>field.onChange(e.target.checked)}/>}/>}/>
 <Controller name="remember" control={form.control} render={({field})=><FormControlLabel label="Remember me" control={<Checkbox {...field} id="remember" size="small"/>}/>}/>
 <div id="table"><Checkbox id="all" checked={rows.every(Boolean)} indeterminate={rows.some(Boolean)&&!rows.every(Boolean)} onChange={e=>setRows(rows.map(()=>e.target.checked))} slotProps={{input:{'aria-label':'Toggle select all'}}}/>{rows.map((v,i)=><Checkbox key={i} id={'row-'+i} checked={v} onChange={e=>setRows(rows.map((x,j)=>i===j?e.target.checked:x))} slotProps={{input:{'aria-label':'Toggle select row '+(i+1)}}}/>)}</div>
 {['end','start','top','bottom'].map(labelPlacement=><FormControlLabel key={labelPlacement} id={'placement-'+labelPlacement} labelPlacement={labelPlacement} disabled={disabled} required label="Consent" control={<Checkbox size="small" defaultChecked/>}/>)}
 {['small','medium','large'].map(size=>['primary','secondary','default'].map(color=><Checkbox key={size+color} id={size+'-'+color} size={size} color={color} disabled={disabled} edge="start" defaultChecked slotProps={{input:{'aria-label':size+' '+color}}}/>))}
 <FormControlLabel id="radio-label" value="early" control={<Radio id="radio" size="small"/>} label="Early flight"/>
 <FormControlLabel id="switch-label" control={<Switch id="switch" size="small"/>} label="Practice notifications"/>
 <FormControlLabel label={<Typography>Existing typography</Typography>} control={<Checkbox/>}/>
 <Checkbox id="prevented" checked={false} onChange={()=>events.current.push('unexpected')} slotProps={{input:{onChange:e=>e.nativeEvent.preventDefault(),'aria-label':'Prevented'}}}/>
 <button id="outside" type="button">Outside</button><button id="reset" type="reset">Reset</button>
 </form></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <FormControlLabel label="Hydrated" control={<Checkbox id="hydrated" defaultChecked/>}/>}
