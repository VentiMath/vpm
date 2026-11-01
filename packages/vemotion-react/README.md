# vemotion-react

Emotion for React, targeting **@emotion/react 11.14.0**, the latest release
checked November 1, 2026: the `css` prop, `Global`, `ClassNames`, `css`,
`keyframes`, `CacheProvider` and theming. On VPM's Emotion packages
([vemotion-cache](../vemotion-cache), [vemotion-serialize](../vemotion-serialize)
and others); React 16.8 or later is a peer. ES modules for browsers and server
rendering.

Cache and theme ownership, global-sheet lifecycle and CSS-prop/ClassNames
rendering now use a source-informed VPM redesign. Shared rendering plans handle
registration and insertion; a mounted Global owns its sheet and cleanup.
JSX adapters, diagnostic wording and declarations retain their existing
contract and attribution. This is not a clean-room claim.
[Provenance](PROVENANCE.json) records the boundary.

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
`/_isolated-hnrs`. Server rendering inserts
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
| Depends on @emotion/babel-plugin (for the `macro` entry), with babel-plugin-macros, cosmiconfig and @babel/runtime, and on hoist-non-react-statics and react-is | No macro entry; statics are hoisted by a small internal function: 4 direct dependencies, all VPM packages |
| A shared memoizer reuses a function theme across independent providers/renders | Each provider memoizes its own result; independent mounts evaluate their own declaration |
| Global hydration searches the global document | The mounted sheet searches its container document and releases its own hydrated styles on unmount |
| Deep or cyclic class arrays recurse until the call stack overflows | Iterative traversal supports deep/shared arrays; ancestor cycles throw a specific TypeError |
| JSX types branch on the `@types/react` version | React's `React.JSX` namespace (`@types/react` 18.2.7 and later) |

The complete Emotion fixture runs on Node 24 under React 16 and 18, retaining
two documented Babel-plugin differences. Focused lifecycle controls and ten
MUI/React 19 caller renders pass on Node 24 and Bun. See the
[conformance record](../../scripts/emotion-conformance/README.md).

Theme functions are memoized within a provider while their identity and parent
theme are unchanged. Recomputing independent mounts does not make mutable
closures reactive within one mount. Cache keys should remain unique within a
document; iframe documents can hydrate their own matching keys.

[Isolated-process measurements](bench/results/README.md) compare five server
rendering paths using each complete Emotion stack. The
[styled caller](../vemotion-styled/bench/results/README.md) is also remeasured
after changes. Fresh CSS-prop rendering takes about 14% more time on Node and
10% on Bun; Node ClassNames rendering takes about 8% more. Most other React
cases have no established direction beyond the control variation. These CPU
measurements do not establish browser rendering or application throughput
improvements.
