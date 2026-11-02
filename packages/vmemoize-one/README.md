# vmemoize-one

Independent, zero-dependency single-result memoization, targeting **memoize-one
6.0.0**. Native ESM, CommonJS and browser bundles; the actual react-window 1.8.11
caller is also verified against its older memoize-one 5.2.1 dependency.

```js
import memoizeOne from 'vmemoize-one';
const sum = memoizeOne((a, b) => a + b);
sum(1, 2);
sum(1, 2); // cached
sum.clear();
```

Only the most recent completed result is retained. Arguments compare by identity
with NaN equal to NaN; argument count and `this` must also match. A custom
comparator receives `(newArguments, previousArguments)`. Throws preserve the
previous completed result. Promises are cached by identity; rejection is not an
automatic invalidation. `clear()` releases retained arguments, receiver and result.

## Deliberate corrections

- Clearing during function evaluation also invalidates its future cache entry.
- Clearing inside a comparator causes a fresh calculation instead of a TypeError.
- Reentrant comparison returns the result belonging to the compared arguments,
  even if the comparator calls the wrapper with different arguments.
- Invalid function/comparator inputs reject at construction.

These fixes do not deep-clone arguments. Mutating an object in place retains its
identity and can yield a cached value; a comparator must reflect the application’s
chosen equality semantics.

All 78 original runtime tests, six focused groups, 4,000 differential calls and
actual react-window renders run on Node24/Bun. Packed CJS/ESM/browser/TypeScript7
consumers are checked. [Fixture details](../../scripts/memoize-conformance/README.md),
[isolated measurements](bench/results/README.md), [provenance](PROVENANCE.json).

The current isolated recording shows 27–52% less time on Node across the four
cases. Bun is mixed: ordinary hits/misses are inconclusive; receiver changes and
custom-comparator hits cost 15% and 45% more. All samples and controls are kept.
These are memoization microbenchmarks, not rendering throughput claims.
