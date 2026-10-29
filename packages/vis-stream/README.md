# vis-stream

Node stream-shape predicates, compared with `is-stream` 2.0.1. Zero runtime
dependencies; Node.js 20+ and Bun; CommonJS and native ESM imports, with
self-contained TypeScript narrowing declarations.

```js
const isStream = require('vis-stream');
isStream(value);
isStream.readable(value);
isStream.writable(value);
isStream.duplex(value);
isStream.transform(value);
```

The callable predicate recognizes non-null objects with a callable `pipe`.
Readable/writable predicates additionally require the corresponding enabled
side, internal method and **non-null object state**. Duplex checks both sides;
transform also requires `_transform`. Legacy duck-typed streams remain supported;
WHATWG streams do not have this Node stream shape. A successful check is not a
native-brand or liveness guarantee. Getters and proxy errors remain observable.

Upstream mistakenly accepts `null` internal state because `typeof null` is
`object`. VPM fixes that and reads `pipe` once during a duplex/transform check.

## Evidence

Six focused tests and all 47 assertions from the pinned upstream suite pass on
Node and Bun. See the [conformance record](../../scripts/google-http-conformance/README.md).
[Raw benchmarks](bench/results) have three fresh processes plus an identical
upstream control per runtime. These very short operations are JIT-sensitive:
Node aggregate medians range from 7–14 ns for VPM versus 7–15 ns upstream;
duplex and transform paired medians are 7.6% and 6.0% lower.
Bun medians are 6–15 ns versus 9–17 ns; readable checks are consistently
65.5% lower in these samples, while other cases show JIT variation.
No application throughput improvement is claimed from these microbenchmarks.

Run `node packages/vis-stream/bench/compare.cjs` (or `bun`) and
`node packages/vis-stream/bench/summarize.cjs --verify-current`.
See [provenance](PROVENANCE.json) and [license](LICENSE).
