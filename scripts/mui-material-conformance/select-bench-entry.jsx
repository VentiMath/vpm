import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {Select,TextField,MenuItem} from '@buttons';
import {makeTheme} from './text-field-scene.jsx';
const theme=makeTheme({variables:true,custom:true}),onChange=()=>{};
export function prepare(kind){const Component=kind==='field'?TextField:Select;const tree=<ThemeProvider theme={theme}>{Array.from({length:12},(_,i)=><Component key={i} id={'select-'+i} name={'select-'+i} label={kind==='field'?'Contest':undefined} select={kind==='field'?true:undefined} helperText={kind==='field'?'Choose a contest':undefined} size="small" variant={kind==='standard'?'standard':'outlined'} value={kind==='multiple'?['amc','arml']:'amc'} multiple={kind==='multiple'} onChange={onChange}><MenuItem value="">All</MenuItem><MenuItem value="amc">AMC</MenuItem><MenuItem value="arml">ARML</MenuItem></Component>)}</ThemeProvider>;return()=>renderToString(tree);}
