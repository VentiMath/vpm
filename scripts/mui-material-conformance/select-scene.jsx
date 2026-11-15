import React from 'react';
import {ThemeProvider} from '@integration';
import {Select,TextField,MenuItem,FormControl,InputLabel,FormHelperText,ListSubheader,InputAdornment} from '@buttons';
import {Controller,useForm} from '@hook-form';
import {makeTheme} from './text-field-scene.jsx';
export function VariantScene({mode='light',variables=false,custom=false,tick=0,disabled=false}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,custom}),[mode,variables,custom]);
 const [value,setValue]=React.useState(''),[multi,setMulti]=React.useState(['b']),[open,setOpen]=React.useState(false),[options,setOptions]=React.useState(['a','b','c']);
 const refs=React.useRef({}),events=React.useRef([]),form=useForm({defaultValues:{number:0,filter:[]}});
 const log=e=>events.current.push({name:e.target.name,value:e.target.value,type:e.type});
 React.useEffect(()=>{window.selectControls={refs,events,form,setValue,setMulti,setOpen,setOptions};},[form]);
 const items=options.map(x=><MenuItem key={x} value={x}>{x.toUpperCase()}</MenuItem>);
 return <ThemeProvider theme={theme}><form id="fixture" style={{padding:20}} data-tick={tick} onSubmit={e=>e.preventDefault()}>
 <FormControl size="small" disabled={disabled} style={{minWidth:240}}><InputLabel id="roster-label">View as</InputLabel><Select labelId="roster-label" id="roster" label="View as" name="roster" value={value} onChange={e=>{log(e);setValue(e.target.value)}} inputRef={n=>{refs.current.roster=n}} ref={n=>{refs.current.root=n}}><MenuItem value=""><em>Self</em></MenuItem><ListSubheader>Members</ListSubheader><MenuItem value="a">Alice</MenuItem><MenuItem value="b" disabled>Bob</MenuItem><MenuItem value="c">Chris</MenuItem></Select><FormHelperText>Choose a member</FormHelperText></FormControl>
 <TextField id="multi" name="multi" label="Contests" size="small" select value={multi} onChange={e=>{log(e);setMulti(e.target.value)}} slotProps={{select:{multiple:true,displayEmpty:true,SelectDisplayProps:{'aria-label':'Filter by contest'}}}}>{items}</TextField>
 <TextField id="empty" select label="Schedule" defaultValue="" slotProps={{select:{displayEmpty:true},inputLabel:{shrink:true}}}><MenuItem value="">All</MenuItem>{items}</TextField>
 <TextField id="readonly" select label="Locked" value="a" slotProps={{input:{readOnly:true}}}>{items}</TextField>
 <TextField id="adorned" select label="Units" value="a" slotProps={{input:{endAdornment:<InputAdornment position="end">kg</InputAdornment>}}}>{items}</TextField>
 <Select id="controlled" value="a" open={open} onOpen={()=>{events.current.push('open');setOpen(true)}} onClose={()=>{events.current.push('close');setOpen(false)}} MenuProps={{transitionDuration:0}}>{items}</Select>
 <Select id="auto" name="auto" defaultValue="a" autoWidth renderValue={v=>'Selected '+v} inputRef={n=>{refs.current.auto=n}}>{items}</Select>
 <Controller name="number" control={form.control} render={({field:{ref,...field}})=><TextField {...field} inputRef={ref} id="number" select label="Grade" size="small"><MenuItem value={0}>None</MenuItem><MenuItem value={6}>Grade 6</MenuItem><MenuItem value={10}>Grade 10</MenuItem></TextField>}/>
 <Controller name="filter" control={form.control} render={({field:{ref,...field}})=><TextField {...field} inputRef={ref} id="filter" select slotProps={{htmlInput:{'aria-label':'Filter by subject'},select:{multiple:true,displayEmpty:true}}}>{items}</TextField>}/>
 <TextField select id="native" name="native" label="Native" defaultValue="a" slotProps={{select:{native:true}}}><option value="a">A</option><option value="b">B</option></TextField>
 <button id="outside">Outside</button>
 </form></ThemeProvider>;
}
export function HydrationScene(){return <TextField id="hydrated" select label="Schedule" value="a"><MenuItem value="a">A</MenuItem></TextField>}
