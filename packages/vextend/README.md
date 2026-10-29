# vextend

Own-property shallow and deep merging for Node.js 20+ and Bun, compared with
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
These are deliberate differences from upstream's inherited-property copying,
symbol omission, repeated alias cloning and recursive cycle failure.

Existing own setters, getters and proxy traps remain observable. A merge is not
transactional: earlier writes can remain after a later getter or assignment
throws. This utility does not make arbitrary executable objects safe to inspect.

## Evidence

11 focused tests include 500 generated differential merges and a 10,000-level
input. The pinned upstream suite passes 90 assertions on Node and Bun, with one
obsolete missing-`Array.isArray` case skipped; see the
[conformance record](../../scripts/google-http-conformance/README.md).

[Raw benchmarks](bench/results) contain three fresh processes and an
identical-upstream control for Node 24.22.1 and Bun 1.4.0. Node's measured shallow
three-field merge is 82 → 191 ns; deep HTTP options are 769 → 1,085 ns; fifty
nested records are 22.3 → 32.2 µs. Cycle tracking, symbols and ownership checks
cost time. Bun's deep-option paired median differs by +4.3%, and larger merges
and shallow cases vary materially between processes. These results do not
establish a Bun speed improvement. This package prioritizes defined merge
semantics; caller-level benchmarks determine its application impact.

Run `node packages/vextend/bench/compare.cjs` (or `bun`), and
`node packages/vextend/bench/summarize.cjs --verify-current` to verify the saved
source hashes. See [provenance](PROVENANCE.json) and [license](LICENSE).
