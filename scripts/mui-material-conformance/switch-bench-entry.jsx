import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {Switch,FormControlLabel,FormControl,FormLabel} from '@buttons';
import {makeTheme} from './switch-scene.jsx';
const theme=makeTheme({variables:true,custom:true});
export function prepare(kind){const tree=<ThemeProvider theme={theme}>{Array.from({length:4},(_,i)=>{const control=<Switch id={'email-'+i} name={'email-'+i} defaultChecked size="small"/>;return kind==='switch'?React.cloneElement(control,{key:i}):kind==='label'?<FormControlLabel key={i} label="Email notifications" control={control}/>:<FormControl key={i} component="fieldset"><FormLabel component="legend">Email preference</FormLabel><FormControlLabel label="Notify me" control={control}/></FormControl>})}</ThemeProvider>;return()=>renderToString(tree);}
