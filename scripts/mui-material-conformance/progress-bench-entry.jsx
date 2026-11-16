import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {CircularProgress,Button} from '@buttons';
import {makeTheme} from './progress-scene.jsx';
const theme=makeTheme({variables:true,custom:true});
export function prepare(kind){const tree=<ThemeProvider theme={theme}>{Array.from({length:8},(_,i)=>{const spinner=<CircularProgress size={24} {...(kind==='determinate'?{variant:'determinate',value:25}:{})} aria-label="Loading exams"/>;return kind==='saving'?<Button key={i} disabled>{spinner}</Button>:React.cloneElement(spinner,{key:i})})}</ThemeProvider>;return()=>renderToString(tree);}
