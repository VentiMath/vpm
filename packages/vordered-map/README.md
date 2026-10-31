# vordered-map

An ordered key/value map based on **@js-sdsl/ordered-map 4.4.2**, with checked
iterators, fewer iterator allocations and logarithmic indexed position lookup.
Zero runtime dependencies, as upstream already has. Supports Node 24+ and Bun.

```js
import {OrderedMap} from 'vordered-map';

const channels = new OrderedMap([[3, {name: 'third'}], [1, {name: 'first'}]]);
for (const i = channels.lowerBound(1); !i.equals(channels.end()); i.next()) {
  console.log(i.pointer[0], i.pointer[1].name);
}
```

CommonJS uses `const {OrderedMap} = require('vordered-map')`. Both imports share
the same constructor. Included declarations require no ambient platform types
and infer inline tuple arrays correctly, including readonly input pairs.

## Changes

- Iterators share navigation methods and allocate their live pair proxy lazily,
  at most once per iterator. Upstream allocates two functions per iterator and a
  new proxy on every `pointer` read.
- Mutation methods reject iterators from another map before either map changes.
  Detached nodes and iterators invalidated by `clear()` cannot be read or reused.
- A retained pair follows its iterator, but throws at the end marker. Upstream
  permits writing the sentinel through that pair, poisoning missing-key lookups.
- Position arguments must be integer numbers within the map. When `enableIndex`
  is true, position lookup/removal uses existing subtree counts in O(log n),
  replacing upstream's O(n) traversal. Ordinary maps retain linear position access.
- `rEnd().pre()` reaches the smallest key, as reverse iteration requires.
  Upstream returns the largest key. Empty predecessor access throws `RangeError`.

The red-black balancing, comparator semantics, sorted bounds, insertion hints,
key updates, union, forward/reverse iteration and generator snapshot behavior
remain based on upstream. Numeric IDs are not a special case.

## Compatibility

The complete `OrderedMap` runtime method surface remains. gRPC **1.14.7** uses
this package for Channelz diagnostics: reference counts, entity lookup, ordered
listing and pagination. This is not the HTTP/2 payload-processing path.

Intentional differences:

| Operation | VPM behavior |
| --- | --- |
| Repeated `iterator.pointer` | Same proxy identity; its key/value still follow the iterator |
| Foreign iterator passed as a hint or to an erase/key-update method | `TypeError`, without mutation |
| Detached or cleared iterator, including retained pair access | `RangeError`; `isAccessible()` returns false |
| End-marker pair access | `RangeError`, including pairs captured before reaching the end |
| Noninteger or nonnumber position | `RangeError`, before traversal or mutation |
| `.index` without `enableIndex: true` | `RangeError`, instead of inconsistent upstream numbers/NaN |
| Reverse-end predecessor | Smallest element; an empty map throws `RangeError` |

`clear()` invalidates existing iterators, including old end iterators; obtain new
ones afterward. `eraseElementByIterator()` still advances and returns the same
iterator, including when removing the final element. Deletion retains upstream's
node-payload swaps: other iterators are not guaranteed to keep referring to the
same key after an erase. Indexed end markers retain upstream's `size - 1` value
(zero for an empty map). Internal fields and tree-node constructors are not API.

## Evidence

- All **14 unchanged upstream tests** pass on Node 24 and Bun, with an original
  implementation control and deterministic random input.
- **54,500 differential operations and bounds checks** cover both comparator
  directions, indexed/unindexed maps, mutation, hints, iteration and ranks.
- Seven focused tests cover the safety fixes and independently check red-black
  invariants, parent links and subtree sizes during mixed mutations.
- All seven original gRPC Channelz handlers pass, including sparse pagination,
  reference counts, disabled registration and cleanup. The broader VPM integration
  fixture also aliases the map in the real gRPC/Google SDK stack.
- Archive checks verify isolated npm/Bun installs, CommonJS/ES imports and types.

Measured 100-entry iterator pages take 11% less time on Node and 42% less on Bun;
actual Channelz pages take 8% / 24% less, with a 7.5% Bun control bias. Some mutation
cases regress by 3–6%; the benchmark report retains those results and controls.

See the [comparison fixture](../../scripts/ordered-map-conformance/README.md),
[paired benchmarks](bench/results/README.md), and [source provenance](PROVENANCE.json).
This verifies the exercised callers, not a deployment or an application-latency gain.
