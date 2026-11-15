import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Switch,FormControlLabel,FormControl,FormLabel,FormGroup} from '@buttons';
import {Controller,useForm} from '@hook-form';
export function makeTheme({mode='light',rtl=false,variables=false,custom=false}={}){return createTheme({cssVariables:variables,...(custom?{spacing:'0.5rem'}:{}),direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'},secondary:{main:'#8b336e'}},...(custom?{components:{MuiSwitch:{defaultProps:{color:'secondary',size:'small'},styleOverrides:{root:{padding:0,margin:8,'--mui-spacing':'0.5rem'},sizeSmall:{width:'calc(var(--mui-spacing) * 3.5)',height:'calc(var(--mui-spacing) * 2)','& .MuiSwitch-thumb':{width:'calc(var(--mui-spacing) * 1.5)',height:'calc(var(--mui-spacing) * 1.5)'},'& .MuiSwitch-switchBase':{padding:'calc(var(--mui-spacing) * 0.25)','&.Mui-checked':{transform:'translateX(12px)'}},'& .MuiSwitch-track':{borderRadius:'calc(var(--mui-spacing) * 1)'}},sizeMedium:{width:'calc(var(--mui-spacing) * 4.5)',height:'calc(var(--mui-spacing) * 2.5)','& .MuiSwitch-thumb':{width:'calc(var(--mui-spacing) * 2)',height:'calc(var(--mui-spacing) * 2)'},'& .MuiSwitch-switchBase':{padding:'calc(var(--mui-spacing) * 0.25)','&.Mui-checked':{transform:'translateX(calc(var(--mui-spacing) * 2))'}},'& .MuiSwitch-track':{borderRadius:'calc(var(--mui-spacing) * 1.25)'}}}}}}:{})});}
export function VariantScene({mode='light',rtl=false,variables=false,custom=false,disabled=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]),cache=React.useMemo(()=>createCache({key:rtl?'switchrtl':'switchltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [stop,setStop]=React.useState(false),[reminder,setReminder]=React.useState(true),events=React.useRef([]),refs=React.useRef({}),form=useForm({defaultValues:{emails:true}});
 React.useEffect(()=>{window.switchControls={setStop,events,refs,form};},[form]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><form id="switches" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20,fontFamily:'Arial'}} onSubmit={e=>e.preventDefault()}>
 <FormGroup><FormControlLabel label="Stop all email" control={<Switch id="stop" name="stop" color="error" checked={stop} disabled={disabled} onChange={(e,c)=>{events.current.push(['stop',c]);setStop(c);if(c)setReminder(false)}}/>}/>
 <FormControlLabel label="Family reminder" control={<Switch id="reminder" name="reminder" checked={reminder} disabled={disabled||stop} onChange={(e,c)=>{events.current.push(['reminder',c]);setReminder(c)}} slotProps={{input:{ref:n=>{refs.current.reminder=n}}}}/>}/></FormGroup>
 <FormControl component="fieldset" disabled={disabled}><FormLabel component="legend">Email settings</FormLabel><Controller name="emails" control={form.control} render={({field:{value,onChange,ref}})=><Switch id="rhf" name="emails" checked={value} onChange={(e,c)=>onChange(c)} slotProps={{input:{ref,'aria-label':'Email notifications'}}}/>}/></FormControl>
 <Switch id="default" name="default" value="yes" defaultChecked ref={n=>{refs.current.root=n}} slotProps={{input:{ref:n=>{refs.current.default=n},'aria-label':'Default checked'}}}/>
 <Switch id="blocked" checked={false} onChange={()=>events.current.push('unexpected')} slotProps={{input:{onChange:e=>e.nativeEvent.preventDefault(),'aria-label':'Blocked'}}}/>
 <Switch id="slot-events" onChange={(e,c)=>events.current.push(['outer',c])} slotProps={{input:{onChange:()=>events.current.push(['input']),'aria-label':'Slot events'},switchBase:{onChange:(e,c)=>events.current.push(['base',c])}}}/>
 <Switch id="direct-label" aria-label="Fuse preference"/>
 <FormGroup row>{['small','medium'].map(size=>['primary','secondary','default','error'].map(color=>[false,true].map(checked=><Switch key={size+color+checked} id={size+'-'+color+'-'+checked} size={size} color={color} disabled={disabled} edge="start" defaultChecked={checked} slotProps={{input:{'aria-label':size+' '+color}}}/>)))}</FormGroup>
 <button type="button" id="outside">Outside</button><button type="reset" id="reset">Reset</button>
 </form></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <FormControlLabel label="Hydrated" control={<Switch id="hydrated" defaultChecked/>}/>}
