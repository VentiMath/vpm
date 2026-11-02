import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import clsx from 'clsx';
import ownClsx from 'vclsx';
import createCache from '@emotion/cache';
import {CacheProvider, Global, ThemeContext, useTheme} from '@emotion/react';
import {ThemeContext as ownContext} from 'vemotion-react';
import styled from '@emotion/styled';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import Button from '@mui/material/Button';
import rtlPlugin from 'stylis-plugin-rtl';

function check(value, message) { if (!value) throw Error(message); }
const wrapInLayer = layerName => node => {
  if (node.root) return;
  const child = {...node, parent: node, root: node};
  Object.assign(node, {children: [child], length: 6, parent: null, props: [layerName], return: '', root: null, type: '@layer', value: `@layer ${layerName}`});
};
const Label = styled('span')(({theme}) => ({color: theme.palette.primary.main, marginLeft: 11}));
function ThemeRead() { return <output id="theme">{useTheme().palette.mode}</output>; }
const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
export async function run() {
  check(clsx === ownClsx && ThemeContext === ownContext, 'aliases share identity');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host); let count = 0;
  const caches = ['ltr', 'rtl'].map(direction => createCache({key: 'mui' + direction,
    stylisPlugins: [...(direction === 'rtl' ? [rtlPlugin] : []), wrapInLayer('mui')]}));
  try {
    for (const [index, direction] of ['ltr', 'rtl'].entries()) {
      for (const [mode, color] of [['light', '#123456'], ['dark', '#abcdef']]) {
        const theme = createTheme({direction, palette: {mode, primary: {main: color}}});
        flushSync(() => root.render(<CacheProvider value={caches[index]}><ThemeProvider theme={theme}>
          <Global styles={{'#global-probe': {color}}} />
          <Button id="button" className={clsx('app', {active: true})}><Label id="label" css={{padding: 3}}>ready</Label></Button>
          <ThemeRead /><span id="global-probe">global</span>
        </ThemeProvider></CacheProvider>));
        await tick();
        const label = getComputedStyle(document.getElementById('label'));
        const expected = mode === 'light' ? 'rgb(18, 52, 86)' : 'rgb(171, 205, 239)';
        check(label.color === expected, 'theme update reaches styled');
        check(label.paddingLeft === '3px', 'JSX css prop uses same cache');
        check(label[direction === 'rtl' ? 'marginRight' : 'marginLeft'] === '11px', 'RTL plugin and layer');
        check(document.getElementById('theme').textContent === mode, 'MUI and Emotion share theme');
        check(document.getElementById('button').classList.contains('active'), 'clsx classes');
        check(getComputedStyle(document.getElementById('global-probe')).color === expected, 'Global updates');
        count += 6;
      }
    }
    flushSync(() => root.unmount()); await tick();
    check(!document.querySelector('style[data-emotion$="-global"]'), 'Global sheet removed on unmount'); count++;
    return {checks: count, scenarios: 'MUI theme changes, LTR/RTL layers, JSX, shared contexts, clsx and cleanup'};
  } finally {for (const cache of caches) cache.sheet.flush(); host.remove();}
}
