import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {TextField,InputAdornment} from '@buttons';
import {makeTheme} from './text-field-scene.jsx';
const theme=makeTheme({variables:true,custom:true}),onChange=()=>{};
export function prepare(kind){const tree=<ThemeProvider theme={theme}>{Array.from({length:12},(_,i)=><TextField key={i} id={'field-'+i} variant={kind==='standard'?'standard':'outlined'} size="small" value={'Contest '+i} onChange={onChange} label={kind==='form'?'Contest':undefined} helperText={kind==='form'?'Enter a name':undefined} required={kind==='form'} error={kind==='form'&&i%3===0} multiline={kind==='multiline'} minRows={kind==='multiline'?2:undefined} slotProps={{input:{startAdornment:<InputAdornment position="start">$</InputAdornment>}}}/>)}</ThemeProvider>;return()=>renderToString(tree);}
