# vextend

Own-property shallow and deep merging for Node.js 24+ and Bun, compared with
`extend` 3.0.2. Zero runtime dependencies; CommonJS, native ESM default import,
and self-contained TypeScript declarations.

```js
const extend = require('vextend');
const options = extend(true, {}, defaults, overrides);
```

`extend(target, ...sources)` mutates and returns the target. An initial boolean
selects deep merging. Null sources and undefined values are ignored; non-object
targets become `{}`. Deep mode merges arrays by index, recursively merges plain
records, and retains references to opaque values such as streams, buffers,
Dates and class instances.

Compared with upstream, only own enumerable properties are copied, including
symbols. Inherited target properties are never used as merge destinations or
setters. `__proto__` becomes an ordinary own data property. Source getters are
read once per visited property; keys removed before copying are skipped.
Cycles and shared references are preserved within each source, using an iterative
walk that also handles deeply nested inputs without recursive stack overflow.
Flat deep merges allocate no memo or traversal frames. Small graphs retain at
most eight identities before promoting to a Map; completed parents are omitted
from the traversal stack. Ordinary new fields avoid a redundant ownership
lookup, while proxy targets retain the original descriptor-before-has trap order.
These are deliberate differences from upstream's inherited-property copying,
symbol omission, repeated alias cloning and recursive cycle failure.

Existing own setters, getters and proxy traps remain observable. A merge is not
transactional: earlier writes can remain after a later getter or assignment
throws. This utility does not make arbitrary executable objects safe to inspect.

## Evidence

16 focused tests include 500 generated differential merges and a 10,000-level
input. The pinned upstream suite passes 90 assertions on Node and Bun, with one
obsolete missing-`Array.isArray` case skipped; see the
[conformance record](../../scripts/google-http-conformance/README.md).

[Paired benchmarks](bench/results/README.md) contain three fresh processes and
identical-baseline controls on Node 24.22.1 and Bun 1.4.0. They compare both
`extend` 3.0.2 and the previous VPM implementation, retained verbatim in
`bench/previous.cjs` with its source commit in the provenance record.

Compared with previous VPM, Node paired operation times are **12% lower for
shallow fields, 29% lower for flat deep merges, 22% lower for HTTP options and
12% lower for 50 nested records**. Bun's flat and larger deep merges take
33% and 10% less time. Bun shallow and HTTP-option results vary substantially;
the latter also has an unstable control, so no gain is claimed for either.

Costs relative to upstream remain: Node shallow fields take 96 → 207 ns,
HTTP options 855 → 953 ns, and 50 nested records 30.9 → 38.5 µs. Bun shallow
fields are 60 → 72 ns; its 50-record case takes about 11% less paired time than
upstream. Snapshotting symbols and ownership checks retain work that upstream
does not perform. The refreshed [vgaxios caller report](../vgaxios/bench/results/README.md)
measures request preparation and HTTP behavior with this merger; these results
do not establish application-wide speedups.

Run `node packages/vextend/bench/compare.cjs` (or `bun`), and
`node packages/vextend/bench/summarize.cjs --verify-current` to verify the saved
source hashes. See [provenance](PROVENANCE.json) and [license](LICENSE).
