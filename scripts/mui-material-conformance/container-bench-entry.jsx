import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {makeTheme,LayoutScene} from './container-scene.jsx';
const theme=makeTheme({custom:true});
export function prepare(kind){const tree=<ThemeProvider theme={theme}><LayoutScene kind={kind}/></ThemeProvider>;return()=>renderToString(tree);}
