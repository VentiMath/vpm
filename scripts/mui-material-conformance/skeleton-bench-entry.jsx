import React from 'react';
import {renderToString} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {makeTheme,LoadingScene} from './skeleton-scene.jsx';
const theme=makeTheme({variables:true});
export function prepare(kind){const tree=<ThemeProvider theme={theme}><LoadingScene kind={kind}/></ThemeProvider>;return()=>renderToString(tree);}
