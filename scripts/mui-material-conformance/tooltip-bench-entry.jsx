import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ThemeProvider} from '@integration';
import {createTheme} from '@mui/material/styles';
import {PanelScene} from './tooltip-scene.jsx';
export function prepare(kind){const node=<ThemeProvider theme={createTheme()}><PanelScene kind={kind}/></ThemeProvider>;return ()=>renderToStaticMarkup(node)}
