import React from 'react';
import {createTheme} from '@mui/material/styles';
import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';
import {Table,TableHead,TableBody,TableFooter,TableRow,TableCell,TableContainer,Paper} from '@buttons';
export function makeTheme({mode='light',variables=false,rtl=false,custom=false}={}){return createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,...(custom?{components:{MuiTableCell:{styleOverrides:{root:{borderBottomWidth:2},head:{fontWeight:700},sizeSmall:{paddingTop:8,paddingBottom:8}}},MuiTableRow:{styleOverrides:{footer:{fontWeight:600}}}}}:{})});}
export function TableScene({mode='light',variables=false,rtl=false,custom=false,size='small',padding='normal',sticky=true,tick=0}={}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,rtl,custom}),[mode,variables,rtl,custom]),cache=React.useMemo(()=>createCache({key:rtl?'tablertl':'tableltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [reverse,setReverse]=React.useState(false),[selected,setSelected]=React.useState(2),ref=React.useRef(),cellRef=React.useRef();
 React.useEffect(()=>{window.tableControls={ref,cellRef,setReverse,setSelected}},[]);
 const rows=Array.from({length:20},(_,i)=>i+1);if(reverse)rows.reverse();
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="tables" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{width:'90vw',maxWidth:780}}>
 <TableContainer id="scores-container" ref={ref} component={Paper} sx={{maxHeight:220}}><Table id="scores-table" size={size} padding={padding} stickyHeader={sticky} aria-label="Practice scores"><caption>Practice scores, synthetic records</caption>
 <TableHead><TableRow id="head-row"><TableCell id="name-head" ref={cellRef} sortDirection={reverse?'desc':'asc'}><button id="sort" onClick={()=>setReverse(v=>!v)}>Student</button></TableCell><TableCell align="center" id="score-head">Score</TableCell><TableCell align="right">Notes</TableCell></TableRow></TableHead>
 <TableBody>{rows.map(i=><TableRow id={'row-'+i} key={i} hover selected={selected===i} onClick={()=>setSelected(i)}><TableCell id={'name-'+i} component="th" scope="row">Student {i}</TableCell><TableCell align="center">{i*2}</TableCell><TableCell align="right">{i===1?<input id="draft" defaultValue="Unsaved note"/>:'Ready'}</TableCell></TableRow>)}</TableBody>
 <TableFooter><TableRow id="footer"><TableCell colSpan={2}>Total</TableCell><TableCell align="right">420</TableCell></TableRow></TableFooter></Table></TableContainer>
 <Table aria-label="Nested results" size="medium"><TableBody><TableRow><TableCell><Table size="small"><TableBody><TableRow><TableCell id="nested">Nested score</TableCell></TableRow></TableBody></Table></TableCell><TableCell id="outer" padding="none">Outer score</TableCell></TableRow></TableBody></Table>
 </section></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <TableScene/>;}
