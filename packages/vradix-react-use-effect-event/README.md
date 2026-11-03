# vradix-react-use-effect-event

Independent implementation of **@radix-ui/react-use-effect-event 0.0.5** for
React 19. A retained event calls the latest committed callback; a suspended or
abandoned render cannot publish a speculative callback.

```jsx
import {useEffectEvent} from 'vradix-react-use-effect-event';
const onChange = useEffectEvent(value => report(value, currentSettings));
```

React 19.2's native `useEffectEvent` is exported directly. On React 19.1, a single
ref owns both the stable callable and its current callback, published during an
insertion effect. This removes the separate memo hook and the older-React layout
effect dependency. React is the only peer; there are no runtime dependencies.

The fallback rejects calls before its first commit and preserves argument,
return, promise and exception behavior. An omitted fallback callback returns
`undefined`. It does **not** emulate every native render-phase check: after a
commit the fallback can call the previous callback during rendering, whereas
React 19.2 rejects render calls. Native callback identity and omitted-callback
behavior remain React's own. Do not invoke effect events while rendering.
React versions before 19 are outside this package's contract.

Node 24 and Bun tests run actual React 19.1.0 and 19.2.4 with StrictMode,
layout/insertion ordering, abandoned Suspense renders, SSR and Radix's unchanged
controllable-state 1.3.0 reducer. Dropdown Menu 2.2.1 also passes Escape and outside
dismissal with the dependency substituted; its ordinary state hook does not
itself invoke the reducer's effect event. Clean npm/Bun consumers verify CJS/ESM,
TypeScript 7 DOM-only declarations and browser bundles.

[Measurements](bench/results/README.md) compare mounted updates and retained
calls using production React in jsdom. They do not measure browser layout or app
latency. Neither runtime establishes a timing difference beyond the control
spread. [Provenance](PROVENANCE.json) records the contract and inspected hashes.
Built, not yet released or adopted by VentiMath.
