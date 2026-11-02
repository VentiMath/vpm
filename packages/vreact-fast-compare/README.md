# vreact-fast-compare

Independent, zero-dependency React-aware deep equality, targeting
**react-fast-compare 3.2.2**. Native ESM, CommonJS and browser bundles.

```js
import equal from 'vreact-fast-compare';
equal({items: [1, 2]}, {items: [1, 2]}); // true
// React.memo(Component, equal)
```

Arrays and own enumerable string properties compare recursively. Constructors,
Map key identity, Set membership, RegExp flags, custom conversion hooks and
numeric typed-array semantics retain the upstream contract. React/Preact owner
fields are ignored on marked elements. Symbol/non-enumerable properties are not
part of this contract; distinct DOM Elements compare unequal.

## Deliberate differences

- DataView compares its visible bytes and offsets; upstream loops indefinitely.
- ArrayBuffer contents matter; upstream treats differing buffers as equal.
- Deep and cyclic values use an explicit work list. Structurally equal cycles
  compare true, without warnings. Shared reference identity is immaterial;
  this does not test graph identity or preserve alias topology.
- Exceptions from application getters or conversion hooks propagate, even if
  their message includes "stack" or "recursion".
- Array and non-array values cannot compare equal by spoofing their constructor.

The fast path allocates no traversal state for ordinary shallow props. Graph
bookkeeping is needed only after 64 levels. The [comparison tests](../../scripts/fast-compare-conformance/README.md)
retain upstream assertions and exercise the actual react-popper caller with
React19. [Measurements](bench/results/README.md) use isolated balanced processes
and identical-source controls. They measure comparison CPU, not UI frame rates.

The current recording is mixed on Node 24: small equal props take 21% less time,
while changed nested values, React children and Map/typed-byte values take
46%, 7% and 12% more. All four Bun cases take less time (4–26%). These
tradeoffs are retained alongside the correctness fixes, without claiming a
universal speedup.

[Provenance](PROVENANCE.json) records implementation and compatibility boundaries.
