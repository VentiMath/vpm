import React from 'react';
import {useForm,Controller} from '@hook-form';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Autocomplete,TextField} from '@buttons';
const schools=['Café School','Cambridge','École','West Academy'];
const initial=[{id:'a',label:'Alice'},{id:'b',label:'Bob',disabled:true},{id:'c',label:'Chris'}];
export function AutocompleteScene({mode='light',rtl=false,variables=false,custom=false,disabled=false,tick=0}={}){
 const theme=React.useMemo(()=>createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,components:custom?{MuiAutocomplete:{styleOverrides:{inputRoot:{gap:3},root:{'& .MuiOutlinedInput-root .MuiAutocomplete-input':{padding:'4px 12px'}},tag:{margin:0},tagSizeSmall:{height:20,minHeight:20,maxHeight:20}}}}:{}}),[mode,rtl,variables,custom]);
 const form=useForm({defaultValues:{schools:['Café School'],school:'',student:null}}),[students,setStudents]=React.useState(initial),[student,setStudent]=React.useState(null),[events]=React.useState([]),root=React.useRef(null),[input,setInput]=React.useState(''),[visible,setVisible]=React.useState(false);
 React.useEffect(()=>{window.autoControls={form,events,setStudents,setStudent,root,setInput,setVisible}},[]);
 const record=(name,value,reason)=>events.push({name,value,reason});
 return <ThemeProvider theme={theme}><form id="auto-form" dir={rtl?'rtl':'ltr'} onSubmit={e=>{e.preventDefault();record('submit')}} data-tick={tick} style={{width:400,padding:24}}>
 <Controller control={form.control} name="schools" render={({field})=><Autocomplete id="schools" size="small" multiple freeSolo options={schools} value={field.value} disabled={disabled} onChange={(e,v,reason)=>{field.onChange(v);record('schools',v,reason)}} renderInput={p=><TextField {...p} label="Schools" inputRef={field.ref} helperText="Choose or enter"/>}/>}/>
 <Controller control={form.control} name="school" render={({field})=><Autocomplete id="school" size="small" freeSolo options={schools} value={field.value} onChange={(e,v,reason)=>{field.onChange(v??'');record('school',v,reason)}} onInputChange={(e,v)=>field.onChange(v)} renderInput={p=><TextField {...p} label="Student school" inputRef={field.ref}/>}/>}/>
 <Autocomplete id="student" ref={root} size="small" sx={{width:260}} options={students} value={student} disabled={disabled} getOptionLabel={o=>o.label} isOptionEqualToValue={(a,b)=>a.id===b.id} getOptionDisabled={o=>!!o.disabled} onChange={(e,v,r)=>{setStudent(v);record('student',v?.id??null,r)}} renderInput={p=><TextField {...p} label="View as"/>}/>
 <Autocomplete id="highlight" options={students} autoHighlight getOptionDisabled={o=>!!o.disabled} onChange={(e,v,r)=>record('highlight',v?.id,r)} renderInput={p=><TextField {...p} label="Practice student"/>}/>
 <Autocomplete id="controlled" options={schools} open={visible} onOpen={()=>setVisible(true)} onClose={(e,r)=>{setVisible(false);record('close',null,r)}} inputValue={input} onInputChange={(e,v)=>setInput(v)} renderInput={p=><TextField {...p} label="Controlled"/>}/>
 <Autocomplete id="empty" options={[]} loading renderInput={p=><TextField {...p} label="Loading"/>}/>
 <Autocomplete id="readonly" options={schools} readOnly defaultValue="Cambridge" renderInput={p=><TextField {...p} label="Readonly"/>}/>
 <button id="outside" type="button">Outside</button></form></ThemeProvider>;
}
export function HydrationScene(){return <AutocompleteScene/>;}
