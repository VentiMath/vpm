import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';
import {TextField,FormHelperText,InputAdornment,useFormControl} from '@buttons';
import {Controller,useForm} from '@hook-form';
import Select from '@control-select';
import MenuItem from '@control-menu-item';
import ControlContext from '@control-context';
import {makeTheme as baseTheme} from './input-decorations-scene.jsx';
export const makeTheme=baseTheme;
// A test-only adapter verifies the real select caller boundary. Neither Select
// nor its menu dependencies are shipped by this TextField implementation.
const SelectAdapter=React.forwardRef(function SelectAdapter(props,ref){const state=useFormControl();return <ControlContext.Provider value={state}><Select {...props} ref={ref}/></ControlContext.Provider>});
function Helper({id,...props}){const state=useFormControl();return <><FormHelperText id={id} {...props}/><output id={id+'-state'}>{JSON.stringify({filled:state.filled,focused:state.focused})}</output></>}
export function VariantScene({mode='light',rtl=false,variables=false,custom=false,disabled=false,error=false,tick=0,narrow=false}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]);
 const cache=React.useMemo(()=>createCache({key:rtl?'fieldrtl':'fieldltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const refs=React.useRef({}),[value,setValue]=React.useState(''),[kind,setKind]=React.useState('once'),form=useForm({defaultValues:{number:0,notes:'one\ntwo'}});
 React.useEffect(()=>{window.variantControls={refs,form,setValue}},[form]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><main id="variants" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20,fontFamily:'Arial',fontSize:16}}>
 {['standard','outlined'].map(variant=><section key={variant} style={{width:narrow?180:280}}>
 <TextField variant={variant} id={variant} label="Contest" helperText="Choose a contest" required disabled={disabled} error={error} fullWidth value={value} onChange={e=>setValue(e.target.value)} inputRef={node=>{refs.current[variant]=node}} slots={{formHelperText:Helper}}/>
 <TextField variant={variant} id={variant+'-small'} label="Fee" size="small" defaultValue="12" disabled={disabled} error={error} slotProps={{input:{startAdornment:<InputAdornment position="start" disablePointerEvents>$</InputAdornment>,endAdornment:<InputAdornment position="end"><button aria-label="Show fee">kg</button></InputAdornment>}}}/>
 <TextField variant={variant} id={variant+'-notes'} label="Notes" multiline minRows={2} maxRows={4} defaultValue={'one\ntwo\nthree'} fullWidth disabled={disabled}/>
 </section>)}
 <Controller name="number" control={form.control} render={({field:{ref,...field}})=><TextField {...field} id="number" inputRef={ref} type="number" size="small" label="Number" helperText="0 to 100" required slots={{formHelperText:Helper}} slotProps={{htmlInput:{min:0,max:100,step:5}}}/>}/>
 <Controller name="notes" control={form.control} render={({field:{ref,...field}})=><TextField {...field} id="rhf-notes" inputRef={ref} multiline minRows={2} label="Travel"/>}/>
 <TextField id="date" type="datetime-local" label="First reminder" slotProps={{inputLabel:{shrink:true}}}/>
 <TextField id="search" variant="standard" placeholder="Search contests" autoComplete="off" slotProps={{input:{disableUnderline:true,inputRef:node=>{refs.current.search=node},classes:{input:'FuseSearch-input'}},htmlInput:{'aria-label':'Search contests',role:'combobox','aria-expanded':false}}}/>
 <TextField id="password" type="password" name="password" label="Password" required autoComplete="current-password" ref={node=>{refs.current.root=node}}/>
 <TextField id="reminder-kind" select label="Schedule" helperText="Reminder frequency" value={kind} onChange={e=>setKind(e.target.value)} slots={{select:SelectAdapter}}><MenuItem value="once">Once</MenuItem><MenuItem value="weekly">Weekly</MenuItem></TextField>
 <button id="outside">Outside</button>
 </main></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <><TextField label="Contest" helperText="Name" defaultValue="AMC"/><TextField label="Notes" multiline defaultValue="Travel"/></>}
