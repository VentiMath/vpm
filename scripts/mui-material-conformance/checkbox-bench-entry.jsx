import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {Checkbox,FormControlLabel,FormControl,FormHelperText} from '@buttons';
import {makeTheme} from './checkbox-scene.jsx';
const theme=makeTheme({variables:true,custom:true}),onChange=()=>{};
export function prepare(kind){const tree=<ThemeProvider theme={theme}>{Array.from({length:12},(_,i)=>{const box=<Checkbox id={'check-'+i} name={'check-'+i} size={kind==='small'?'small':'medium'} checked={i%2===0} indeterminate={kind==='table'&&i%3===0} onChange={onChange} slotProps={{input:{'aria-label':'Select contest '+i}}}/>;return kind==='label'?<FormControlLabel key={i} label={'Contest '+i} control={box}/>:kind==='form'?<FormControl key={i} error={i%3===0}><FormControlLabel required label={'Contest '+i} control={box}/><FormHelperText>Confirm your interest</FormHelperText></FormControl>:<React.Fragment key={i}>{box}</React.Fragment>})}</ThemeProvider>;return()=>renderToString(tree);}
