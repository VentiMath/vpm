# vreselect

Independent Reselect **5.3.0** selector memoization, with zero runtime dependencies.
App-pinned **5.1.1** is a separate comparison control.

```js
import {createSelector} from 'vreselect';
const selectContests = createSelector(
  [state => state.contests, (_, year) => year],
  (contests, year) => contests.filter(contest => contest.year === year),
  {memoizeOptions: {maxSize: 100}, argsMemoizeOptions: {maxSize: 100}},
);
```

Supports `createSelector`, `createSelectorCreator`, `createStructuredSelector`,
`lruMemoize`, `weakMapMemoize`, `referenceEqualityCheck`, `setGlobalDevModeChecks`
and typed-state `.withTypes()` helpers. Selectors expose both cache levels,
computation counters, dependencies, result functions and the last computed result.
Caches retain exceptions as misses and distinguish argument arity. LRU uses
strict equality by default; weak caches use native Map/WeakMap key semantics.

Weak caches own object/function keys weakly. Primitive keys are retained until
cleared unless `maxSize` is set. The current 5.3 bound keeps two generations;
it is approximately twice the configured capacity, not an exact LRU bound.
Configure both selector cache levels when bounding primitive growth. Optional
result equality preserves references. `clearCache` resets counts; a weak cache
retains its previous result for deduplication, weakly when it is an object.

Development checks cover unstable inputs, identity result functions and growing
primitive caches. Mode is fixed at module load; messages are independently worded.
CJS/ESM share state. Node24, Bun1.4.4, modern browser bundles and TypeScript7 are
checked. The types cover selector/state/parameter/result inference and public
memoizer configuration; upstream's internal type utility aliases are not cloned.
Older experimental autotracking is outside scope and absent from current5.3 exports.

This is a transitive MUI X foundation. The unchanged `@mui/x-internals`8.7 selector
wrapper passes value, reference-reuse and computation-count comparisons. The app
uses MUI X date pickers in calendar/notes and date providers at its roots, but
those imports alone do not prove this wrapper runs on a particular route.
No app dependency, production deployment or release was changed.

[Conformance](../../scripts/reselect-conformance/README.md),
[measurements](bench/results/README.md) and [provenance](PROVENANCE.json) record
the exact scope. Performance results are local cache workloads, not app latency.

Measured results are mixed. Versus current5.3, single-entry LRU hits/misses use
about 27%/7% less Node time and 43%/27% less Bun time. Compared with app5.1,
Node's changed-state case uses about 52% less time, but the MUI wrapper cache-hit
case takes 42 ns versus 36 ns (18% more). Bun weak-cache hits take 12 ns versus
current's 8 ns and 25 ns versus app's 20 ns; its current selector hit takes 8 ns
versus 6 ns. The app comparison's changed-state case takes 149 ns versus 115 ns
(38% more). Other directions are unestablished under the recorded controls.
There is no overall speedup claim. [Initial measurements](bench/initial/README.md)
retain the first implementation's larger overhead before cache-path simplification.

To reproduce, install the pinned conformance fixture and run
`node scripts/reselect-conformance/build.cjs` before the benchmark commands.
