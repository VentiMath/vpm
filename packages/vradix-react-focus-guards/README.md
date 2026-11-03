# vradix-react-focus-guards

Independent implementation of **@radix-ui/react-focus-guards 1.2.0** for React 19.
Adds a shared pair of invisible, keyboard-focusable spans at the edges of the
current document body. Radix menus use these alongside their focus scopes.
The final mounted consumer removes the pair.

```jsx
import {FocusGuards, useFocusGuards} from 'vradix-react-focus-guards';
<FocusGuards><Menu /></FocusGuards>
// Or call useFocusGuards() inside a component.
```

`Root` aliases `FocusGuards`. CommonJS and native ESM share one ownership map.
React is the only peer; there are no other runtime dependencies.

Unlike upstream's single global pair, ownership is per body: a consumer mounting
in a second document cannot steal the first document's guards, and a detached
body's cleanup cannot remove the replacement body's pair. Mounts restore guards
to the body edges, StrictMode cleanup is safe, and foreign marked nodes stay
untouched. The hook still selects the ambient document at effect time; it does
not infer a portal's document or accept a document option. Server rendering does
not access the DOM. React versions before 19 are outside the supported contract.

Node 24/Bun controls exercise shared lifetimes, StrictMode, foreign nodes, multiple
bodies, SSR and the unchanged **@radix-ui/react-menu 2.2.1** caller, including
Escape dismissal. Clean npm/Bun archives check CJS/ESM identity, TypeScript 7
DOM-only consumers and browser bundling. [Measurements](bench/results/README.md)
cover React mounting and cleanup in jsdom, not browser layout or app latency.
Neither runtime establishes a timing difference beyond the control spread; the
benefit here is document ownership, not a demonstrated speed increase.

[Provenance](PROVENANCE.json) records the inspected contract and source hashes.
Built, not yet released or adopted by VentiMath.
