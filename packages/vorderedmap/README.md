# vorderedmap

An independently written persistent string-key map matching the public API of
**orderedmap 2.1.1**. It preserves explicit key order while edits return a new
map. This is the small schema helper beneath ProseMirror and Tiptap, not the
unrelated sorted-tree package `@js-sdsl/ordered-map`.

```js
import OrderedMap from 'vorderedmap';

const nodes = OrderedMap.from({paragraph: {}, text: {}});
const extended = nodes.addBefore('paragraph', 'heading', {});
// extended: heading, paragraph, text. nodes is unchanged.
```

`from`, `get`, `update`, `remove`, `addToStart`, `addToEnd`, `addBefore`, `forEach`,
`prepend`, `append`, `subtract`, `toObject` and `size` are available. `from(null)`
and `from()` create empty maps; `from(existingMap)` returns that same instance.
Values retain their identity and are not cloned. `forEach` receives key, then
value. `addBefore` inserts before its anchor, or at the end when the anchor is
absent. Moving a key removes its earlier position. Incoming keys win in merges:
`prepend` places the incoming map first, and `append` places it last. Renaming
replaces any existing target key while retaining the source position among the
remaining entries.

## Improvements and deliberate differences

- Bulk merges and subtraction filter once using key membership, avoiding
  upstream's repeated removal, search and array copying.
- Maps with at least 32 entries build a private lookup index on first lookup.
  Smaller maps use compact sequential storage. Ordinary value-only updates can
  share the index; structural edits build their own when needed.
- Input records contribute only their own enumerable string keys. Inherited
  properties do not become schema entries.
- `toObject()` keeps an ordinary Object prototype and preserves `__proto__` as
  an own data property, rather than invoking the legacy prototype setter.
- An explicitly empty `newKey` renames to the empty string. Upstream treats it
  as if no new name were supplied.
- Identical-value updates return the same instance (`Object.is` semantics).
  Internal sequences are private. Upstream's undocumented mutable `content` and
  `find` implementation fields are not supported; construct maps with `from`.

There are no runtime dependencies or peers. Node 24, Bun and modern browsers are
supported; no Node or DOM globals are needed. CJS and ESM share one class identity.
This is not a persistent balanced tree: ordinary edits still copy a sequence.

## Verification and measurements

[Contract tests](test/contracts.test.cjs) compare 4,000 deterministic edit steps
against upstream, retain historical snapshots and cover the deliberate
corrections separately. The unchanged ProseMirror **1.25.4** app baseline and
**1.25.12** current caller preserve schema ordering, default node types, mark
precedence, extension edits and document JSON round-trips.

[Consumer checks](../../scripts/orderedmap-conformance/README.md) exercise exact
archives through fresh and frozen npm/Bun installs, both module formats,
TypeScript 7 with no ambient platform types, and an executed browser bundle.
[Isolated benchmarks](bench/results/README.md) include small-map creation/edits,
larger lookups/bulk edits and actual ProseMirror schema construction. These are
local workload measurements, not editor responsiveness claims.

In the final recording, 128-entry lookups take **74.4% / 79.3% less time** on
Node / Bun; overlapping merges and subtraction take **81–82% / about 90% less**.
Those directions hold across every pair beyond the identical-source controls.
The lookup case measures repeated reads after index construction; building that
index on a first read is additional work and memory, not a cold-lookup speedup.

On Node, constructing 16 entries costs **70 → 162 ns** (+92 ns, +130.6%).
Own-key enumeration and private storage retain a cost on that small path.
Bun construction takes 16.8% less time. Ordinary update and complete ProseMirror
schema-construction directions are unestablished in this recording. All raw
pairs, including unfavorable samples, remain in the report.

Built and tested; not released or adopted by VentiMath. See
[provenance](PROVENANCE.json) for the pinned upstream reference and intentional
API differences. Runtime and declarations are independently written, with MIT
attribution retained; this is not a clean-room claim.
