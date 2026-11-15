import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {makeTheme} from './input-decorations-scene.jsx';
import {FormControl,InputLabel,FormHelperText,Input,OutlinedInput,InputAdornment} from '@buttons';
const theme=makeTheme({variables:true,custom:true}),onChange=()=>{};
export function prepare(kind){const Field=kind==='standard'?Input:OutlinedInput;const children=Array.from({length:12},(_,i)=>{const field=<Field key={i} label={kind==='standard'?undefined:'Contest'} id={'field-'+i} value={'Contest '+i} onChange={onChange} multiline={kind==='multiline'} minRows={kind==='multiline'?2:undefined} size="small" startAdornment={<InputAdornment position="start">$</InputAdornment>}/>;return kind==='form'?<FormControl key={i} required error={i%3===0} size="small"><InputLabel htmlFor={'field-'+i}>Contest</InputLabel>{field}<FormHelperText>Enter a name</FormHelperText></FormControl>:field});const tree=<ThemeProvider theme={theme}>{children}</ThemeProvider>;return()=>renderToString(tree);}
