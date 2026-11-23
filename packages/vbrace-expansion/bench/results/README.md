# Brace expansion measurements

Current brace-expansion 5.0.13 versus VPM on Node 24.22.1 and Bun 1.4.4.
Four isolated AB/BA process pairs and two identical-source control pairs, with
equal iteration counts per pair, warmup, retained results and raw samples.
`node.json` and `bun.json` retain runtime details, source hashes and controls.

| Runtime | Operation | Upstream ns | VPM ns | Median paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24.22.1 | Literal build path | 465 | 22 | -94.8% | lower in every pair beyond control spread |
| Node 24.22.1 | File extension alternatives | 1524 | 1113 | -23.4% | inconclusive |
| Node 24.22.1 | Nested build pattern | 6158 | 3382 | -45.2% | inconclusive |
| Node 24.22.1 | Padded numeric range | 15110 | 6016 | -60.9% | lower in every pair beyond control spread |
| Node 24.22.1 | Unchanged minimatch caller | 17731 | 16103 | -5.4% | inconclusive |
| Bun 1.4.4 | Literal build path | 235 | 4 | -98.3% | lower in every pair beyond control spread |
| Bun 1.4.4 | File extension alternatives | 1046 | 756 | -24.7% | inconclusive |
| Bun 1.4.4 | Nested build pattern | 4211 | 3361 | -25% | inconclusive |
| Bun 1.4.4 | Padded numeric range | 9284 | 8432 | -4.8% | inconclusive |
| Bun 1.4.4 | Unchanged minimatch caller | 11441 | 11360 | -5.5% | inconclusive |

Literal paths avoid interpreter frames entirely; simple option members also
avoid suspended child frames without changing budget handling. The literal
case repeats one constant path, making it particularly favorable to JIT
optimization. It is not a forecast for an entire build. Node's padded-range
case is also lower in every pair beyond control spread.

The other cases do not establish a speedup or slowdown. Some controls and
process pairs vary substantially, including a 91.3% Node nested-pattern
control spread. The paired change uses each comparison pair and need not
equal the ratio of the aggregate median times. The unchanged minimatch caller
includes parsing and matching work beyond brace expansion.

```sh
OUTPUT=/tmp/brace-node.json node packages/vbrace-expansion/bench/compare.cjs
OUTPUT=/tmp/brace-bun.json bun packages/vbrace-expansion/bench/compare.cjs
```
