# vuse-sync-external-store

React **19** external-store subscriptions, targeting `use-sync-external-store`
**1.7.0** and checked against the application's 1.6.0 callers. Zero runtime
dependencies; React is a peer.

The base hook and `shim` import paths re-export React's native
`useSyncExternalStore`. React owns subscription lifetime, concurrent-render
consistency and hydration. The selector helper is independently written: it
caches a snapshot/selection pair for each render configuration, retains equal
selected values, and publishes committed selections after React commits.

```js
import {useSyncExternalStoreWithSelector} from 'vuse-sync-external-store/with-selector';
const count = useSyncExternalStoreWithSelector(
  store.subscribe, store.getState, store.getServerState,
  state => state.count,
);
```

The root, `with-selector`, `shim`, `shim/with-selector` and upstream `.js`/native
import aliases work in ESM and CommonJS. Public declarations ship in the package.
An optional equality function can retain the previous selected object when only
unselected fields change. Selector/equality failures leave the prior cache pair
intact and propagate through React's error handling.

This deliberately excludes the original React 16/17 shim and React 18 support.
Use it with React 19, including callers that still import `/shim`. No React
implementation is copied into VPM. Native hook identity is preserved; there is
no claimed speedup for native subscriptions themselves.

Twelve mounted cases run against original 1.7.0, original 1.6.0 and VPM on Node
24/Bun: snapshots, selector/equality changes, identity, errors, SSR/hydration,
StrictMode cleanup, suspended renders and an actual React Redux 9.2.0 caller.
Four focused cache groups and packed npm/Bun CJS/ESM/browser/TypeScript 7 consumers
also pass. [Verification](../../scripts/external-store-conformance/README.md),
[measurements](bench/results/README.md), [provenance](PROVENANCE.json).

VentiMath's lockfile also reaches this package through MUI Data Grid, Tiptap,
XState and MobX. Those callers are dependency evidence, not separately certified
integration tests. This replacement is built, not yet installed in the app.

MIT; React's license and upstream test attribution are retained.
