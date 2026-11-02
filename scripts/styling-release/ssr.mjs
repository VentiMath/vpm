import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import clsx, {clsx as named} from 'clsx';
import ownClsx from 'vclsx';
import lite from 'clsx/lite';
import createCache from '@emotion/cache';
import {CacheProvider, ThemeContext} from '@emotion/react';
import {ThemeProvider, createTheme} from '@mui/material/styles';
import {ThemeContext as ownContext} from 'vemotion-react';
import styled from '@emotion/styled';
import {jsx} from '@emotion/react/jsx-runtime';
import Button from '@mui/material/Button';
assert.equal(clsx, ownClsx); assert.equal(clsx, named); assert.equal(ThemeContext, ownContext);
assert.equal(clsx('a', ['b', {c: true}]), 'a b c'); assert.equal(lite('a', {}, 'b'), 'a b');
const Label = styled.span(({theme}) => ({color: theme.accent}));
const cache = createCache({key: 'release'});
const html = renderToStaticMarkup(React.createElement(CacheProvider, {value: cache},
  React.createElement(ThemeProvider, {theme: createTheme({accent: '#123456'})},
    React.createElement(Button, {variant: 'contained', className: clsx('app', {active: true})},
      jsx(Label, {css: {padding: 3}, children: 'ready'})))));
assert.match(html, /color:#123456/); assert.match(html, /padding:3px/); assert.match(html, /app active/);
assert.match(html, /MuiButton/); assert.match(html, /ready/);
assert.ok(Object.keys(cache.inserted).length > 0);
console.log('styling SSR checks pass');
