# vfast-deep-equal

Deep equality targeting **fast-deep-equal 3.1.3**, the latest stable release checked
October 30, 2026. Zero runtime dependencies; Node.js 24+ and Bun.

```js
const equal = require('vfast-deep-equal');
equal({tags: ['a', 'b']}, {tags: ['a', 'b']}); // true
equal(Buffer.from([0xff]), Buffer.from([0xfe])); // false
```

CommonJS and native ES module imports support the root, `es6`, `react` and
`es6/react` paths, including their `index` and `.js` aliases. The ES6 paths are aliases: all entry points support collections
and binary data. React variants skip an element's `_owner` during traversal,
retaining upstream's `$$typeof` check.

## Changes from 3.1.3

- Buffers compare their bytes, using the runtime's native buffer comparator.
  Upstream's default entry point converts buffers to UTF-8 strings, which can
  make different invalid byte sequences compare equal. This affects actual
  Firestore document and array-transform comparisons.
- `DataView` compares its selected byte range instead of entering the upstream
  ES6 comparator's infinite loop. `ArrayBuffer` and `SharedArrayBuffer` compare
  their bytes as well.
- Null-prototype records work. Non-callable `valueOf` and `toString` fields are
  compared as ordinary data instead of being called and throwing.
- Arrays require an array on both sides, including when another object has an
  own `constructor: Array` property. Array elements and record values are read
  once during traversal; conversion hooks are inspected separately.
- Map key-presence/value checks share one pass; Set iteration avoids entry-pair
  allocation. Record ownership and value checks share a pass, with direct
  equality before recursive comparisons. Separate generated ordinary and React
  recursors come from one checked source template.

## Contract and intentional differences

As upstream does, the comparator checks constructor identity, own enumerable
string keys and array elements. Symbol/non-enumerable keys and array properties
outside the indexed elements are ignored. `NaN` primitives compare equal; `0`
and `-0` compare equal. Dates, RegExp and callable custom conversion hooks retain
upstream behavior, including unequal invalid dates and conversion-hook precedence
over record fields. Getters and custom hooks execute; their errors propagate.

Map keys and Set members use identity/SameValueZero semantics, matching upstream
ES6; Map values compare recursively. Typed arrays use strict element comparison,
so distinct floating arrays containing `NaN` compare unequal. The root now uses
these ES6 collection/typed-array rules too. Distinct Promise, WeakMap and WeakSet
objects compare unequal instead of being mistaken for empty records.

Ordinary cyclic graphs remain unsupported. Other exotic platform objects,
modified native prototypes/constructors and cross-realm comparisons are outside
the verified contract. Shared memory comparisons are not atomic snapshots.
Browser bundling and deployment are not certified by the Node/Bun checks.

## Evidence

- [Upstream suite](../../scripts/deep-equal-conformance/README.md): 626 unchanged
  tests on both runtimes, including original React rendering tests.
- [Focused tests](test/equal.test.cjs): binary and dictionary fixes, array kinds,
  getters, collections, modern React element markers, module entry points and a
  deterministic 2,000-pair JSON differential against Node's strict comparator.
- [Actual Firestore 9.4.0 callers](../../scripts/deep-equal-conformance/callers.cjs):
  document, query/filter, array transform and aggregate equality, with original
  controls reproducing two binary false positives. These are local SDK equality
  checks; they do not imply a database request speedup or application adoption.
- [Paired measurements](bench/results/README.md) retain all samples, controls,
  source hashes and regressions.

The measured 1 KiB Buffer comparison takes 65% less time on Node and 88% less
on Bun; small equal records improve 14% on both. Actual Firestore equality paths
improve 4–9% on Node. Bun retains caller regressions of 7–25% in pooled results
(with a larger, unstable query spread), and nested Map equality is 20% slower on
Node. The report includes those costs, controls and the earlier measurements.

MIT licensing and the pinned source are recorded in [PROVENANCE.json](PROVENANCE.json).
