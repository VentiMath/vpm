import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {makeTheme} from './input-scene.jsx';
import {FormControl,FormLabel,FormHelperText,InputBase} from '@buttons';
const theme=makeTheme({variables:true,custom:true});
const onChange=()=>{};
export function prepare(kind){const children=Array.from({length:12},(_,i)=>kind==='form'?<FormControl key={i} required error={i%3===0} size="small" sx={{mb:2}}><FormLabel htmlFor={'contest-'+i}>Contest</FormLabel><InputBase id={'contest-'+i} value={String(i)} onChange={onChange} aria-describedby={'help-'+i}/><FormHelperText id={'help-'+i}>Enter a name</FormHelperText></FormControl>:<InputBase key={i} id={'field-'+i} value={'Contest '+i} onChange={onChange} multiline={kind==='multiline'} minRows={kind==='multiline'?2:undefined} maxRows={kind==='multiline'?4:undefined} size="small" aria-label="Contest"/>);const tree=<ThemeProvider theme={theme}>{children}</ThemeProvider>;return()=>renderToString(tree);}
