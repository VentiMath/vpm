# JSON file measurements

Recorded against jsonfile 6.2.1 on Node 24.22.1 and Bun 1.4.4. Each implementation
runs in a fresh process: four balanced AB/BA pairs, two identical-source control
pairs and twelve samples per process. Raw records include source hashes and
all samples. Runtime runs are sequential, with validation outside timing.

Formatting and memory-filesystem cases measure JSON/adapter overhead; the memory
filesystem invokes its callback immediately and performs no disk I/O. The final
case reads one small real file through the native synchronous API. These are
component measurements, not complete Capacitor build timings.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| compact formatting | 0.31 → 0.28 µs | 0.14 → 0.11 µs |
| tab-indented config formatting | 0.61 → 0.37 µs | 0.41 → 0.14 µs |
| CRLF config formatting | 0.59 → 0.62 µs | 0.39 → 0.40 µs |
| sync parse through memory filesystem | 0.55 → 0.53 µs | 0.14 → 0.13 µs |
| Promise parse through memory filesystem | 0.90 → 0.69 µs | 0.37 → 0.27 µs |
| Promise write through memory filesystem | 1.02 → 0.57 µs | 0.70 → 0.34 µs |
| sync native config read | 15.95 → 14.80 µs | 13.69 → 13.60 µs |

**Node paired evidence:**

- compact formatting: direction unestablished at this precision.
- tab-indented config formatting: 39% lower time in every pair, beyond the same-source control spread.
- CRLF config formatting: 5.1% higher time in every pair, beyond the same-source control spread.
- sync parse through memory filesystem: direction unestablished at this precision.
- Promise parse through memory filesystem: 22.8% lower time in every pair, beyond the same-source control spread.
- Promise write through memory filesystem: 43.9% lower time in every pair, beyond the same-source control spread.
- sync native config read: direction unestablished at this precision.

**Bun paired evidence:**

- compact formatting: 19.3% lower time in every pair, beyond the same-source control spread.
- tab-indented config formatting: 66.4% lower time in every pair, beyond the same-source control spread.
- CRLF config formatting: direction unestablished at this precision.
- sync parse through memory filesystem: direction unestablished at this precision.
- Promise parse through memory filesystem: 28.4% lower time in every pair, beyond the same-source control spread.
- Promise write through memory filesystem: 51.7% lower time in every pair, beyond the same-source control spread.
- sync native config read: direction unestablished at this precision.

The initial CRLF formatter allocated a split array before joining it. The final
implementation replaces newlines directly while treating dollar-bearing line
endings literally. The raw reports below measure that final implementation.
The extra literal-ending check remains a small cost; no application speedup is
claimed. Table entries are medians of process medians; paired percentages are
medians of per-pair ratios, so they need not equal the ratio of table entries.

[Node samples](node.json) · [Bun samples](bun.json)

```sh
OUTPUT=packages/vjsonfile/bench/node.json node packages/vjsonfile/bench/compare.cjs
OUTPUT=packages/vjsonfile/bench/bun.json bun packages/vjsonfile/bench/compare.cjs
```
