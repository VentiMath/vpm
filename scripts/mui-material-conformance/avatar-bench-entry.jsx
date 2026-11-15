import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {Avatar,Chip,Button} from '@buttons';
import {makeTheme,photo} from './avatar-scene.jsx';
const theme=makeTheme({variables:true,custom:true});
export function prepare(kind){const tree=<ThemeProvider theme={theme}>{Array.from({length:8},(_,i)=>{const avatar=<Avatar alt="Student" {...(kind==='photo'?{src:photo,variant:'rounded'}:{})}>{kind==='fallback'?undefined:'A'}</Avatar>;return kind==='chip'?<Chip key={i} avatar={avatar} label={'Student '+i}/>:React.cloneElement(avatar,{key:i})})}</ThemeProvider>;return()=>renderToString(tree);}
