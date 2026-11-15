import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme,getContrastRatio} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Chip} from '@buttons';
import Avatar from '@avatar';
import SvgIcon from '@svg';
export const person=<Avatar>A</Avatar>,lock=<SvgIcon><path d="M6 10h12v10H6z"/></SvgIcon>;
export function makeTheme({mode='light',rtl=false,variables=false,custom=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'},secondary:{main:'#8b336e'}},...(custom?{components:{MuiChip:{defaultProps:{size:'small'},styleOverrides:{root:{borderRadius:6,padding:2},label:{paddingTop:0,paddingBottom:0,paddingRight:8,paddingLeft:8},outlined:({ownerState,theme})=>{if(!ownerState.color||ownerState.color==='default')return {};const {main,light,dark}=theme.palette[ownerState.color],page=theme.palette.background.paper;if(getContrastRatio(main,page)>=4.5)return {};return {color:[light,dark].reduce((a,b)=>getContrastRatio(b,page)>getContrastRatio(a,page)?b:a,main)}}}}}}:{})});}
export function VariantScene({mode='light',rtl=false,variables=false,custom=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]),cache=React.useMemo(()=>createCache({key:rtl?'chiprtl':'chipltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [selected,setSelected]=React.useState(false),events=React.useRef([]),refs=React.useRef({});
 React.useEffect(()=>{window.chipControls={events,refs};},[]);
 const push=name=>()=>events.current.push(name);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="chips" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20,fontFamily:'Arial',maxWidth:700}}>
 <Chip id="select" label="Contest interest" color={selected?'primary':'default'} variant={selected?'filled':'outlined'} onClick={()=>{events.current.push('select');setSelected(!selected)}} ref={n=>{refs.current.select=n}}/>
 <Chip id="remove" label="Roommate" avatar={person} onClick={push('click')} onDelete={push('delete')} draggable onDragStart={push('drag')} onKeyDown={e=>events.current.push('down:'+e.key+':'+e.defaultPrevented)} onKeyUp={e=>events.current.push('up:'+e.key)} />
 <Chip id="custom-delete" label="Custom roommate" onClick={push('custom-click')} onDelete={push('custom-delete')} deleteIcon={<SvgIcon onClick={push('icon-click')}><path d="M2 2h20v20H2z"/></SvgIcon>}/>
 <Chip id="nested" label={<input aria-label="Nested" defaultValue="x"/>} onDelete={push('nested-delete')}/>
 <Chip id="disabled" label="Disabled preference" disabled onClick={push('disabled-click')} onDelete={push('disabled-delete')}/>
 <Chip id="disabled-delete" label="Disabled removal" disabled onDelete={push('disabled-delete')}/>
 <Chip id="skip" label="Skipped" disabled skipFocusWhenDisabled onDelete={push('disabled-delete')}/>
 <Chip id="plain-click" label="Plain appearance" clickable={false} onClick={push('plain-click')}/>
 <Chip id="link" component="a" href="#contest" clickable label="Contest page"/>
 <Chip id="multiline" label="Awaiting the family’s confirmation before assigning a roommate to this contest" role="status" sx={{maxWidth:240,height:'auto',alignSelf:'flex-start','& .MuiChip-label':{whiteSpace:'normal',py:.5}}}/>
 <Chip id="badge" label={4} size="small" color="secondary" sx={{backgroundColor:'#243569',color:'white'}}/>
 <Chip id="slots" label="Slot label" slotProps={{root:{'data-root':'root'},label:s=>({'data-size':s.size,ref:n=>{refs.current.label=n}})}}/>
 <div>{['small','medium'].map(size=>['filled','outlined'].map(variant=>['default','primary','secondary','error','info','success','warning'].map((color,i)=><Chip key={size+variant+color} id={size+'-'+variant+'-'+color} size={size} variant={variant} color={color} label="Status" avatar={i%3===0?person:undefined} icon={i%3===1?lock:undefined} onClick={i%2?push('variant'):undefined} onDelete={i%3===2?push('variant-delete'):undefined}/>)))}</div>
 <button id="outside">Outside</button>
 </div></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <Chip id="hydrated" label="Hydrated roommate" onDelete={()=>{}}/>}
