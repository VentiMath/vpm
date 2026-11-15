import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Radio,RadioGroup,FormGroup,FormControlLabel,FormControl,FormLabel,FormHelperText,useRadioGroup} from '@buttons';
import {Controller,useForm} from '@hook-form';
export function makeTheme({mode='light',rtl=false,variables=false,custom=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'},secondary:{main:'#8b336e'}},...(custom?{components:{MuiRadio:{defaultProps:{color:'secondary'},styleOverrides:{root:{padding:8}}},MuiFormGroup:{styleOverrides:{row:{gap:4}}}}}:{})});}
function GroupState(){const s=useRadioGroup();return <output id="group-state">{JSON.stringify({name:s.name,value:s.value})}</output>}
const options=['stacked','friends','school','casual'];
export function VariantScene({mode='light',rtl=false,variables=false,custom=false,disabled=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]),cache=React.useMemo(()=>createCache({key:rtl?'radiortl':'radioltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [choice,setChoice]=React.useState('stacked'),events=React.useRef([]),refs=React.useRef({}),actions=React.useRef(null),form=useForm({defaultValues:{direction:'ltr'}});
 React.useEffect(()=>{window.radioControls={setChoice,events,refs,actions,form};},[form]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><form id="radios" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20,fontFamily:'Arial'}} onSubmit={e=>e.preventDefault()}>
 <FormControl disabled={disabled} error component="fieldset"><FormLabel component="legend" id="flight-label">How should your team be formed?</FormLabel><RadioGroup aria-labelledby="flight-label" name="team" value={choice} actions={actions} onChange={(e,v)=>{events.current.push(['group',v]);setChoice(v)}} ref={n=>{refs.current.group=n}}>
 {options.map(v=><FormControlLabel key={v} label={v} value={v} control={<Radio id={v} size="small" disabled={v==='school'||disabled} onChange={(e,c)=>events.current.push(['radio',v,c])} slotProps={{input:{ref:n=>{refs.current[v]=n}}}}/>}/>)}<GroupState/>
 </RadioGroup><FormHelperText>Choose one option</FormHelperText></FormControl>
 <RadioGroup id="default-group" name="flight" defaultValue="early" row>{['early','late'].map(v=><FormControlLabel key={v} value={v} label={v} control={<Radio id={v}/>}/>)}</RadioGroup>
 <RadioGroup id="automatic-a" defaultValue="a"><Radio value="a" slotProps={{input:{'aria-label':'A'}}}/></RadioGroup><RadioGroup id="automatic-b" defaultValue="b"><Radio value="b" slotProps={{input:{'aria-label':'B'}}}/></RadioGroup>
 <Controller name="direction" control={form.control} render={({field})=><RadioGroup {...field} row>{['ltr','rtl'].map(v=><FormControlLabel key={v} value={v} control={<Radio id={'rhf-'+v}/>} label={v}/>)}</RadioGroup>}/>
 <Radio id="blocked" checked={false} onChange={()=>events.current.push('unexpected')} slotProps={{input:{onChange:e=>e.nativeEvent.preventDefault(),'aria-label':'Blocked'}}}/>
 <FormGroup row>{['small','medium','large'].map(size=>['primary','secondary','default'].map(color=><Radio key={size+color} name={size+color} id={size+'-'+color} size={size} color={color} disabled={disabled} edge="start" defaultChecked slotProps={{input:{'aria-label':size+' '+color}}}/>))}</FormGroup>
 <button type="button" id="outside">Outside</button><button type="reset" id="reset">Reset</button>
 </form></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <RadioGroup defaultValue="a"><FormControlLabel label="Hydrated" value="a" control={<Radio id="hydrated"/>}/><Radio value="b"/></RadioGroup>}
