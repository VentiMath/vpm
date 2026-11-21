# vtrace-mapping

Traces generated JavaScript positions back to their original files, lines,
columns and names. Babel's generator uses this when generating from a mapped
input. The same package supplies decoded segments to gen-mapping and traces
multi-step transforms for remapping.

```js
import { TraceMap, originalPositionFor } from "vtrace-mapping";

const map = new TraceMap(sourceMap, "/assets/app.js.map");
const location = originalPositionFor(map, { line: 1, column: 12 });
```

The comparison target is `@jridgewell/trace-mapping` 0.3.31. The supported
surface covers flat version-3 JSON, encoded and decoded mappings, forward and
reverse lookups with both biases, source content, ignore lists and ordered
iteration. Original-position queries take one-based lines and zero-based columns.
The low-level `traceSegment` uses zero-based lines and columns. Indexed maps
with `sections` and the `FlattenMap`/`AnyMap` exports are outside this implementation.

The resolver and mapping codec are VPM packages. Encoded maps decode on first
access and reverse queries build a sparse index on demand. Sorting an unordered
decoded map preserves the caller's arrays. Invalid coordinates on public
position queries raise a range error, including fractional and non-finite inputs.

On the Babel printer map, the first lookup decodes 4,947 segments. It took
167 µs on Node and 202 µs on Bun, compared with 118 µs and 115 µs upstream.
Once decoded, 64 forward lookups took 0.94 µs on Node versus 1.25 µs upstream.
The corresponding Bun difference fell within the benchmark's control spread.

[Caller verification](../../scripts/source-map-conformance/README.md) · [Benchmark results](bench/results/README.md)
