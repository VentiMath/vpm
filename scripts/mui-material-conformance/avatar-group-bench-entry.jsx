import React from 'react';import {renderToString} from 'react-dom/server';import {ThemeProvider} from '@integration';import {makeTheme,PanelScene} from './avatar-group-scene.jsx';
const theme=makeTheme({variables:true,custom:true});
export function prepare(kind){const tree=<ThemeProvider theme={theme}><PanelScene kind={kind}/></ThemeProvider>;return()=>renderToString(tree);}
