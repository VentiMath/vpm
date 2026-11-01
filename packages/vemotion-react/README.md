# vemotion-react

Emotion for React, targeting **@emotion/react 11.14.0**, the latest release
checked November 1, 2026: the `css` prop, `Global`, `ClassNames`, `css`,
`keyframes`, `CacheProvider` and theming. On VPM's Emotion packages
([vemotion-cache](../vemotion-cache), [vemotion-serialize](../vemotion-serialize)
and others); React 16.8 or later is a peer. ES modules for browsers and server
rendering.

```jsx
// tsconfig/babel: jsxImportSource 'vemotion-react' (or alias @emotion/react)
import {css, Global, ThemeProvider} from 'vemotion-react';

const button = css({padding: 8, borderRadius: 4});
export const App = () => (
  <ThemeProvider theme={{color: 'hotpink'}}>
    <Global styles={{body: {margin: 0}}} />
    <button css={[button, theme => ({color: theme.color})]}>Go</button>
  </ThemeProvider>
);
```

Entries: `vemotion-react`, `vemotion-react/jsx-runtime` and
`/jsx-dev-runtime` (the automatic JSX runtime with the `css` prop),
`/types/css-prop` (the `css` prop on every element for the classic runtime) and
`/_isolated-hnrs`. The behavior is the original's: server rendering inserts
`<style data-emotion>` elements, `Global` keeps a sheet of its own before the
cache's elements, and in development `globalThis.EMOTION_RUNTIME_AUTO_LABEL`
labels styles from the stack.

## Using it in place of @emotion/react

VPM's Emotion packages import each other by their own names
(`vemotion-styled` imports `vemotion-react`). React contexts (theme, cache)
work only with one instance, so an application aliases the original names
to VPM's in its bundler and TypeScript configuration rather than installing
both: for Vite, `resolve.alias: {'@emotion/react': 'vemotion-react',
'@emotion/styled': 'vemotion-styled', '@emotion/cache': 'vemotion-cache', ...}`
with the same `paths` in `tsconfig.json`. MUI then uses VPM's packages, and
`declare module '@emotion/react' { interface Theme {...} }` augments
vemotion-react's `Theme`.

## Differences from @emotion/react 11.14.0

| @emotion/react | vemotion-react |
| --- | --- |
| Depends on @emotion/babel-plugin (for the `macro` entry), with babel-plugin-macros, cosmiconfig and @babel/runtime, and on hoist-non-react-statics and react-is | No macro entry; statics are hoisted by a small internal function: 5 direct dependencies, all VPM packages |
| JSX types branch on the `@types/react` version | React's `React.JSX` namespace (`@types/react` 18.2.7 and later) |

Emotion's suite passes with this package in place of the original, under React
16 and 18; see the [conformance record](../../scripts/emotion-conformance/README.md).
