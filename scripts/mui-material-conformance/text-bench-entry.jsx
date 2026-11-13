import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@mui/material/styles';
import {makeTheme} from './text-scene.jsx';
import {Typography,Link,SvgIcon} from '@buttons';
const theme=makeTheme({variables:true});
export function prepare(kind){
 const children=Array.from({length:12},(_,i)=>kind==='typography'?<Typography key={i} variant={i%3?'body2':'h6'} noWrap={i===11} color="textSecondary" sx={{mb:1}}>Contest {i}</Typography>:kind==='links'?<Link key={i} href={'/contest/'+i} underline={i%2?'hover':'always'}>Contest {i}</Link>:<SvgIcon key={i} fontSize="small" color="primary" titleAccess={'Contest '+i}><path d="M2 2h20v20H2z"/></SvgIcon>);
 const tree=<ThemeProvider theme={theme}>{children}</ThemeProvider>;return()=>renderToString(tree);
}
