# vrope-sequence

Independent persistent sequences targeting **rope-sequence 1.3.4**, with zero
runtime dependencies. Verified with ProseMirror history **1.5.1** and VentiMath's
pinned **1.5.0** caller.

```js
import RopeSequence from "vrope-sequence";
const first = RopeSequence.from([1, 2, 3]);
const next = first.append([4]).slice(1);
next.flatten(); // [2, 3, 4]; first still contains [1, 2, 3]
```

Supports `from`, `empty`, `length`, `append`, `prepend`, `slice`, `get`, `forEach`,
`map` and `flatten`. Reverse iteration starts at `from - 1` and ends at `to`;
returning exactly `false` stops `forEach`. Whole slices, existing sequences and
empty appends/prepends preserve identity. Out-of-range `get` returns `undefined`.

## Implementation and differences

A private AVL tree shares unchanged branches and uses leaves of at most 128
entries. Appends and slices copy bounded leaf data and the affected tree path.
`flatten()` writes one output array, avoiding intermediate concatenated arrays.
No upstream implementation is shipped.

Input arrays and flattened results are detached from storage. Upstream shares
these arrays, so mutating one can change an existing sequence. Element objects
retain their identity: this is not a deep clone. Input copying ignores custom
`slice` methods and species constructors so they cannot return shared storage. Internal tree fields are private;
upstream's undocumented `.left`, `.right`, `.values` and `.depth` are not exposed.
`length` and the shared `empty` reference are read-only.

Fractional/NaN boundaries throw. `slice` clamps integer or infinite bounds to the
sequence; `forEach`/`map` require bounds within it. Invalid iteration bounds are
rejected rather than exposing undefined values or shape-dependent behavior.
`from` accepts arrays, local sequences, `null` or no argument. Declarations include
`flatten` and the possible `undefined` result of `get`.

## Verification

The [fixture](../../scripts/rope-sequence-conformance/README.md) runs upstream's
unchanged test program with a reproducible seed. Five independent groups cover
6,000 persistent edits against array/upstream oracles, detached storage, reverse
iteration, stopping, identity and invalid bounds; a 30,000-item alternating build
checks repeated concatenation and slicing.

Both history versions retain their upstream implementation and use the same pinned
model/state/transform controls. Each produces 433 matching snapshots covering
undo/redo, grouping, depth limits, untracked mappings and redo invalidation.
A runtime assertion verifies that history actually holds VPM sequences. Node,
Bun and executed browser bundles run these comparisons. Packed npm/Bun consumers
also check exact archive bytes, frozen installs, CJS/ESM identity and TS7 types.
This verifies the history data structure, not full editor/IME acceptance.

[Isolated benchmarks](bench/results/README.md) compare construction, sequence
operations and a real history edit/undo cycle. Defensive snapshots have an
allocation cost; speed is workload-dependent. All samples and controls are retained.
Recorded middle slicing is 31% faster on Node and 34% faster on Bun; flattening
16,384 entries is 61% and 76% faster. Creating a 32-entry sequence costs 7 → 34 ns
on Node and 4 → 41 ns on Bun because VPM copies storage instead of retaining the
input array. Appending 16 entries to a 4,096-item sequence costs 110 → 170 ns and
100 → 155 ns. Joining, reverse scans and random lookup regress on Node; Bun's
lookup improves, while its join/scan directions are inconclusive. The full
32-edit/undo history workload is inconclusive on both engines, with opposing
process-pair directions. The report retains that noise and every regression.
These are local microbenchmarks, not evidence of an overall editor speedup.

Public release, VentiMath adoption and the history implementation are separate.
