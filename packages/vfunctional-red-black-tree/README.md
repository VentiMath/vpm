# vfunctional-red-black-tree

**Runtime dependency eliminated.** Firestore now owns an independently written
persistent snapshot index. No VPM runtime package imports this general tree.
This package remains an attributed upstream-derived reference; it is not counted
as independently rewritten. [Provenance](PROVENANCE.json) records that boundary.

Persistent red-black trees targeting **functional-red-black-tree 1.0.1**, the
latest stable release checked October 31, 2026. Zero runtime dependencies;
Node.js 24+ and Bun.

```js
const createTree = require('vfunctional-red-black-tree');
const empty = createTree((a, b) => a - b);
const one = empty.insert(2, 'two').insert(1, 'one');
const two = one.remove(2);
one.keys; // [1, 2] — earlier versions are unchanged
two.keys; // [1]
one.find(2).index; // 1
```

Every modification (`insert`, `remove`, an iterator's `remove` or `update`)
returns a new tree and leaves the original intact, sharing unchanged nodes.
Upstream Firestore 9.4.0 uses these trees to preserve `onSnapshot` results.
VPM Firestore now preserves that contract with its own index.
CommonJS and native ES module imports provide the same default function; the
upstream `rbtree.js` path is also exported.

## API

`createTree(compare?)` returns an empty tree. `compare(a, b)` follows
`Array.prototype.sort`; without one, keys order by `<` and `>`. Equal keys are
kept as separate entries, and lookups return the first match found while
descending.

| Tree member | Result |
| --- | --- |
| `insert(key, value)` | New tree with the entry added |
| `remove(key)` | New tree without one entry for `key`, or the same tree |
| `get(key)` | A value for `key`, or `undefined` |
| `find(key)`, `ge`, `gt`, `lt`, `le` | Iterator at the matching entry |
| `at(index)`, `begin`, `end` | Iterator at a position, the first or the last entry |
| `forEach(visit, lo?, hi?)` | In-order visit of keys `>= lo` and `< hi`; a truthy result stops and is returned |
| `keys`, `values`, `length`, `root` | Sorted keys, their values, the entry count and the root node |

Iterators expose `valid`, `key`, `value`, `node`, `index`, `hasNext`, `hasPrev`,
`next()`, `prev()`, `clone()`, `remove()` and `update(value)`. Moving an iterator
never changes its tree. An invalid iterator's `index` is the tree length.

Nodes keep upstream's layout (`key`, `value`, `left`, `right`, `_color`,
`_count`), and prototype methods and iterator accessors keep upstream's
enumerability. Nodes are shared between versions: treat them as read-only.

## Changes from 1.0.1

- `at(index)` returns an invalid iterator for an empty tree, where upstream
  throws a `TypeError`, and for any index that is not an in-range integer. Upstream
  treats `NaN` as index 0 and returns the first entry.
- A truthy comparator that is not a function throws a `TypeError` immediately.
  Upstream accepts it and fails on the second insert. Falsy values still select
  the default comparator.
- `keys`, `values` and `forEach` walk iteratively, and bounded `forEach` skips
  subtrees outside its range. Results, visit order and early exit are unchanged.

`forEach` still distinguishes its bounds by argument count, as upstream does: an
explicitly passed `undefined` bound is compared like any key. Comparator calls
can differ in number and order from upstream; comparators should be pure.

## Historical evidence for the retained implementation

These records verify the retained package, not the current VPM Firestore index.
For that index, see the [Firestore contract](../vgoogle-cloud-firestore/README.md).

- [Upstream suite](../../scripts/rbtree-conformance/README.md): the 9 original
  tape tests and their 25,663 assertions pass unchanged on Node and Bun, including
  their red-black invariant checks on internal nodes.
- [Focused tests](test/tree.test.cjs): persistence of every version across 2,000
  generated operations, 3,000 generated operations matching the original's node
  layout exactly, iterators and bounds, the `at()` and comparator fixes, upstream
  enumerability and a 100,000-entry tree.
- [Actual Firestore 9.4.0 caller](../../scripts/rbtree-conformance/callers.cjs):
  an `onSnapshot` query over a local gRPC Listen stream, with ordering,
  added/modified/removed indexes and a retained earlier snapshot matching the
  original tree.
- [Paired measurements](bench/results/README.md), with controls and source hashes.

The latest isolated Node recording supports faster key and range traversal;
its remaining cases and all Bun cases are inconclusive, including Firestore
Watch. Raw samples include slower Bun traversals and remain alongside both
process orders and the controls. Inconclusive results do not establish parity.
These are tree CPU measurements, not listener latency.

MIT licensing and the pinned source are recorded in [PROVENANCE.json](PROVENANCE.json).
