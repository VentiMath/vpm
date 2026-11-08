# Table measurements

Recorded November 8, 2026 on Node 24.22.1 and Bun 1.4.0. The controls are
Table core 9.3.1 and the application's 8.20.5. Both execute the same fixture
operations as VPM. These are core-operation timings, not browser rendering or
application performance measurements.

Each report uses four isolated comparison pairs and two identical-source
control pairs, with balanced AB/BA order, twelve samples per process, equal
iteration counts within pairs, and validation outside timing. Source hashes and
all raw samples are retained in [Node](node.json) and [Bun](bun.json). Percentage
changes are medians of paired ratios, not ratios of the aggregate nanosecond
medians. Negative percentages mean less time.

| Case | Node vs Table 9 | Bun vs Table 9 | Node vs app Table 8 | Bun vs app Table 8 |
| --- | ---: | ---: | ---: | ---: |
| Construct and materialize 48 rows | +7.3% uncertain | -64.5% | -3.3% uncertain | -4.2% uncertain |
| Cached page model | -94.5% | -92.9% | -88.7% | -82.7% |
| Toggle sort over 500 rows | +61.7% | -4.0% uncertain | -5.5% uncertain | -52.1% |
| Toggle filter over 500 rows | +5.1% uncertain | +22.8% | +21.1% | -0.8% uncertain |

“Uncertain” means the process pairs or identical-source controls do not establish
a change at this precision. No small percentage is treated as a reliable win.

The unchanged row-model fast path avoids repeating the pipeline when options
and state retain identity. Sorting resolves columns/comparators once per sort
and reuses the source ID index. These remove substantial avoidable overhead,
but Node sorting still takes about 63 µs versus 39 µs for current Table 9.
Filtering retains the measured Node regression against the app control and Bun
regression against the current control. No across-the-board speedup is claimed.

```sh
OUTPUT=packages/vtanstack-table-core/bench/results/node.json node packages/vtanstack-table-core/bench/compare.cjs
OUTPUT=packages/vtanstack-table-core/bench/results/bun.json bun packages/vtanstack-table-core/bench/compare.cjs
```
