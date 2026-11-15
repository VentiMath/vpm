import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {Radio,RadioGroup,FormControlLabel,FormControl,FormLabel} from '@buttons';
import {makeTheme} from './radio-scene.jsx';
const theme=makeTheme({variables:true,custom:true});
export function prepare(kind){const tree=<ThemeProvider theme={theme}>{Array.from({length:4},(_,i)=>{const controls=['stacked','friends','school','casual'].map(value=><FormControlLabel key={value} value={value} label={value} control={<Radio size="small"/>}/>);return kind==='radio'?<Radio key={i} name={'flight-'+i} defaultChecked size="small"/>:kind==='group'?<RadioGroup key={i} name={'team-'+i} defaultValue="friends">{controls}</RadioGroup>:<FormControl key={i}><FormLabel>Team preference</FormLabel><RadioGroup name={'team-'+i} defaultValue="friends" row>{controls}</RadioGroup></FormControl>})}</ThemeProvider>;return()=>renderToString(tree);}
