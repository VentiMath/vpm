import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {makeTheme} from './input-variants-scene.jsx';
import {FormControl,FormLabel,FormHelperText,Input,OutlinedInput} from '@buttons';
const theme=makeTheme({variables:true,custom:true}),onChange=()=>{};
export function prepare(kind){const Field=kind==='standard'?Input:OutlinedInput;const children=Array.from({length:12},(_,i)=>{const field=<Field key={i} label={kind==='standard'?undefined:'Contest'} id={'field-'+i} value={'Contest '+i} onChange={onChange} multiline={kind==='multiline'} minRows={kind==='multiline'?2:undefined} size="small"/>;return kind==='form'?<FormControl key={i} required error={i%3===0} size="small"><FormLabel htmlFor={'field-'+i}>Contest</FormLabel>{field}<FormHelperText>Enter a name</FormHelperText></FormControl>:field});const tree=<ThemeProvider theme={theme}>{children}</ThemeProvider>;return()=>renderToString(tree);}
