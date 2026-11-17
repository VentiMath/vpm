import React from 'react';import {renderToString} from 'react-dom/server';import {ThemeProvider} from '@integration';import {makeTheme,PanelScene} from './drawer-scene.jsx';
const theme=makeTheme();export function prepare(kind){const tree=<ThemeProvider theme={theme}><PanelScene variant={kind} keepMounted={kind==='temporary'}/></ThemeProvider>;return()=>renderToString(tree);}
