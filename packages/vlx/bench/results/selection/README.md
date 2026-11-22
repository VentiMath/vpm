# Selectable math, VLX 0.3.1 versus 0.3.0

Synthetic string-output cases, Node 24.22.1 and Bun 1.4.4. Four isolated
comparison pairs alternate order; two identical-source controls report noise.
Raw process samples and source hashes are retained in the adjacent JSON.

| Case | Node old → new | Bun old → new |
| --- | ---: | ---: |
| Uncached fraction | 28.1 → 32.3 µs | 31.2 → 36.3 µs |
| Uncached ruled array | 38.8 → 45.1 µs | 41.4 → 50.6 µs |
| Cached fraction | 209 → 216 ns | 118 → 119 ns |

The native selection layer adds text nodes and output work. The Node fraction
and Bun array increases exceed the identical-source control spread in every
pair; the other changes are not established at this precision. Cached output
has no established change. This measures renderer work, not application latency,
browser selection or complete page rendering. Layout and image output retain
their earlier geometry. Reusing immutable glyph selection output reduced the
initial prototype's overhead before these measurements.

Reproduce after extracting the committed 0.3.0 package:

```sh
OUTPUT=/tmp/selection-node.json node scripts/vlx-conformance/bench-selection.cjs /path/to/vlx-0.3.0
OUTPUT=/tmp/selection-bun.json bun scripts/vlx-conformance/bench-selection.cjs /path/to/vlx-0.3.0
```
