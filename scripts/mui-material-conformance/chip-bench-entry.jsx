import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {Chip} from '@buttons';
import {makeTheme,person} from './chip-scene.jsx';
const theme=makeTheme({variables:true,custom:true}),noop=()=>{};
export function prepare(kind){const tree=<ThemeProvider theme={theme}>{Array.from({length:8},(_,i)=><Chip key={i} label={kind==='status'?'Confirmed':'Roommate '+i} color={i%2?'primary':'secondary'} variant={i%2?'filled':'outlined'} {...(kind==='preferences'?{onClick:noop}:kind==='roommates'?{onClick:noop,onDelete:noop,avatar:person,draggable:true}:{})}/>)}</ThemeProvider>;return()=>renderToString(tree);}
