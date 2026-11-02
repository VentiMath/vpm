# Shallow-equal measurements

Recorded November 1, 2026 on Apple M1 Pro, Node 24.22.1 / Bun 1.4.0, against
shallow-equal 3.1.0. The shared [process harness](../../../../scripts/bench-process.cjs)
runs one implementation per fresh process, four balanced AB/BA pairs and two
identical-source controls. Warmup and validation are outside timing; all samples
are retained without trimming. No benchmarks ran concurrently with test suites.

Median process times in nanoseconds per operation:

| Case | Node original → VPM | Bun original → VPM |
| --- | ---: | ---: |
| Equal suggestion arrays | 18 → 18 | 8 → 8 |
| Changed suggestion arrays | 24 → 24 | 9 → 9 |
| Equal props objects | 114 → 119 | 28 → 28 |
| Generic mixed kinds | 6 → 6 | 4 → 4 |

No directional performance result clears the conservative process/control-spread
check. These small comparisons establish neither a speedup nor an end-user UI
latency change. Node's object median is about 5 ns higher; the result remains
within the observed process variation.

Reproduce serially from the repository root after installing the pinned fixture:

```sh
OUTPUT=packages/vshallow-equal/bench/results/node.json node packages/vshallow-equal/bench/compare.cjs
OUTPUT=packages/vshallow-equal/bench/results/bun.json bun packages/vshallow-equal/bench/compare.cjs
```

[node.json](node.json) and [bun.json](bun.json) include source hashes, process
order, raw samples, controls and summary evidence. `verify(report, packageRoot)`
from the harness recomputes summaries and checks source hashes.
