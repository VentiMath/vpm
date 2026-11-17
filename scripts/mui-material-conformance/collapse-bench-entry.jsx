import React from 'react';import {renderToString} from 'react-dom/server';import {ThemeProvider} from '@integration';import {makeTheme,PanelScene} from './collapse-scene.jsx';
const theme=makeTheme();
export function prepare(kind){const tree=<ThemeProvider theme={theme}><PanelScene kind={kind}/></ThemeProvider>;return()=>renderToString(tree);}
