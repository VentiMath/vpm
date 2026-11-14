import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {makeTheme} from './forms-scene.jsx';
import {FormControl,FormLabel,FormHelperText} from '@buttons';
const theme=makeTheme({variables:true,custom:true});
export function prepare(kind){const children=Array.from({length:12},(_,i)=>kind==='form'?<FormControl key={i} required error={i%3===0} fullWidth size={i%2?'small':'medium'} sx={{mb:2}}><FormLabel htmlFor={'contest-'+i}>Contest</FormLabel><input id={'contest-'+i} aria-describedby={'help-'+i}/><FormHelperText id={'help-'+i}>Enter a name</FormHelperText></FormControl>:kind==='label'?<FormLabel key={i} required focused={i%2===0}>Contest {i}</FormLabel>:<FormHelperText key={i} error={i%2===0} variant="outlined">{i%3?'Help':' '}</FormHelperText>);const tree=<ThemeProvider theme={theme}>{children}</ThemeProvider>;return()=>renderToString(tree);}
