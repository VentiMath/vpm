import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {makeTheme} from './surfaces-scene.jsx';
import {Paper,Divider,Icon} from '@buttons';
const theme=makeTheme({variables:true,custom:true});
export function prepare(kind){
 const children=Array.from({length:12},(_,i)=>kind==='paper'?<Paper key={i} component="article" elevation={i%4} variant={i%3?'elevation':'outlined'} sx={{p:2,mb:1}}>Contest {i}</Paper>:kind==='divider'?<Divider key={i} orientation={i%3?'horizontal':'vertical'} variant="middle" flexItem>{i%2?'Round '+i:undefined}</Divider>:<Icon key={i} color="primary" fontSize={i%3?'small':'large'}>palette</Icon>);
 const tree=<ThemeProvider theme={theme}>{children}</ThemeProvider>;return()=>renderToString(tree);
}
