# vradix-react-id

Independent implementation of **@radix-ui/react-id 1.1.4** for React 19.
Uses React's native IDs directly, retaining Radix's `radix-` prefix and optional
deterministic override. Empty strings fall back to the generated ID, as upstream.

```jsx
import {useId} from 'vradix-react-id';
const id = useId(); // or useId('my-explicit-id')
return <><label htmlFor={id}>Name</label><input id={id}/></>;
```

React supplies stable identities and server/hydration coordination. The wrapper
always calls the hook, even with an override, so changing the override cannot
change hook order. Separate roots should use React's `identifierPrefix` option.
Explicit duplicate IDs remain the caller's responsibility; IDs are not list keys.

There is no extra state, layout effect or process-global fallback counter. The
upstream layout-effect dependency is removed. React is the only peer; React
versions before 19 are outside the supported contract. CJS/ESM share one export.

Node 24/Bun controls cover real React 19.1.0 and 19.2.4: exact SSR markup,
StrictMode, override changes, remounts, independent roots, hydration, and current
Dropdown Menu 2.2.1's actual trigger/content ARIA links and Escape dismissal.
Clean npm/Bun archives verify CJS/ESM, TypeScript 7 DOM-only consumers and browser
bundles. [Measurements](bench/results/README.md) use isolated processes and
identical-source controls. They measure React SSR and synchronous DOM updates,
not browser layout or application latency. Neither runtime establishes a timing
difference beyond the control spread; the recorded samples were noisy.

[Provenance](PROVENANCE.json) records the upstream contract and source hashes.
Built, not yet released or adopted by VentiMath.
