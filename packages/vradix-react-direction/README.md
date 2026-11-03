# vradix-react-direction

Independent implementation of **@radix-ui/react-direction 1.2.0** for React 19.
`useDirection()` selects a local override, otherwise the nearest provider, otherwise
`ltr`. Nested providers and updates follow React's normal context behavior.

```jsx
import {DirectionProvider, useDirection} from 'vradix-react-direction';
function Label() {
  return <span dir={useDirection()}>Example</span>;
}
<DirectionProvider dir="rtl"><Label /></DirectionProvider>
```

`Provider` aliases `DirectionProvider`. CommonJS and native ESM share one context.
React is the only peer; there are no other runtime dependencies. Older React
versions are outside the supported contract. The public behavior matches upstream;
this small rewrite does not claim a correctness or application performance gain.

Node 24 and Bun controls compare default/nested/local direction, StrictMode
updates, SSR, hydration and the unchanged Radix RovingFocus keyboard caller.
Clean npm/Bun archives verify mixed CJS/ESM context identity, TypeScript 7 DOM-only
consumers and browser bundling. [Measurements](bench/results/README.md) cover
server rendering, not browser navigation or application latency.

[Provenance](PROVENANCE.json) records the inspected contract and source hashes.
Built, not yet released or adopted by VentiMath.
