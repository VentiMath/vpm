# vradix-react-use-is-hydrated

Independent **@radix-ui/react-use-is-hydrated 0.1.3** hook for React 19, with zero
runtime dependencies.

```jsx
import { useIsHydrated } from 'vradix-react-use-is-hydrated';
function Status() {
  return <span>{useIsHydrated() ? 'Client ready' : 'Server snapshot'}</span>;
}
```

Returns `false` during server rendering and each root's initial hydration, then
`true` after hydration. A fresh client-only mount starts at `true`. A root that
has already mounted cannot change another root's hydration snapshot.

React's external-store hook owns the transition. The implementation shares its
snapshot and subscription callbacks across renders and omits the old-React
fallback, dynamic hook detection and global hydration flag. It does not infer
whether unrelated async work or all descendants have finished loading.

[Paired checks](../../scripts/radix-hydrated-conformance/README.md) cover Node 24,
Bun, React 19.1/19.2, SSR after client mount, independent roots, StrictMode,
hydration identity and the unchanged Roving Focus caller. Clean npm/Bun archive
installs verify module identity, types and production Chrome hydration.

[Isolated measurements](bench/results/README.md) compare 128 hooks at a time:
Bun updates take 37.1% less time beyond the identical-code controls. Node update
and both SSR directions are inconclusive. These synthetic React/jsdom results
do not establish an application speedup.

Built, not released or adopted. [Provenance](PROVENANCE.json) records the
reference and independent implementation; no copied upstream runtime or
clean-room claim. The browser check covers Chrome, not every browser or manual
assistive-technology behavior.
