# Balanced delimiter measurements

balanced-match 5.0.0 versus the independent VPM implementation. Four isolated
AB/BA process pairs and two identical-source control pairs per runtime; raw
samples and source hashes are in `node.json` and `bun.json`.

| Runtime | Operation | Upstream ns | VPM ns | Median paired change |
| --- | --- | ---: | ---: | ---: |
| Node 24.22.1 | Short brace pair | 77 | 69 | -8.7% |
| Node 24.22.1 | Deep unmatched prefix | 1734 | 1622 | -8.4% |
| Node 24.22.1 | Unchanged brace expansion caller | 3121 | 3112 | 4.8% |
| Bun 1.4.4 | Short brace pair | 37 | 39 | 2.6% |
| Bun 1.4.4 | Deep unmatched prefix | 1890 | 1931 | 2.2% |
| Bun 1.4.4 | Unchanged brace expansion caller | 2396 | 2564 | 11.4% |

These runs **do not establish a speedup or slowdown**. Process-to-process spread
and identical-source controls are noisy (up to 231% in the Node caller control),
and the comparison pairs change direction. The paired percentage is calculated
per pair, so it need not equal the ratio of the aggregate median timings.

The caller case expands eight paths through unchanged brace-expansion; it is
not a complete Vite/Babel build benchmark. This package's result is an
independent, compatible delimiter implementation, not a claimed build speedup.

```sh
OUTPUT=/tmp/balanced-node.json node packages/vbalanced-match/bench/compare.cjs
OUTPUT=/tmp/balanced-bun.json bun packages/vbalanced-match/bench/compare.cjs
```
