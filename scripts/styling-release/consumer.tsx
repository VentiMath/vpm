import * as React from 'react';
import clsx from 'clsx';
import lite from 'clsx/lite';
import styled from '@emotion/styled';
import {CacheProvider, ThemeProvider, useTheme} from '@emotion/react';
import {useTheme as useVpmTheme} from 'vemotion-react';
import createCache, {type StylisPlugin} from '@emotion/cache';
import Button from '@mui/material/Button';

declare module '@emotion/react' { interface Theme { accent: string } }
const plugin: StylisPlugin = element => { void element; };
const cache = createCache({key: 'consumer', stylisPlugins: [plugin]});
const Label = styled.span(({theme}) => ({color: theme.accent}));
function Child() {
  const theme = useTheme(), same = useVpmTheme();
  const value: string = same.accent;
  return <Label css={{marginLeft: 4}} className={clsx('label', {active: true}, lite('plain'))}>{theme.accent + value}</Label>;
}
export const App = <CacheProvider value={cache}><ThemeProvider theme={{accent: 'red'}}><Button><Child /></Button></ThemeProvider></CacheProvider>;
