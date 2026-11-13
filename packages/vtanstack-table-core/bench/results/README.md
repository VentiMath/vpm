# Table measurements

These November 8 reports describe the earlier source snapshot identified by their
hashes. The later collapsed-group selection correction has separate
[selection measurements](../selection/README.md).

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
| Construct and materialize 48 rows | +29.9% uncertain | -65.0% | -3.9% uncertain | -5.5% uncertain |
| Cached page model | -94.1% uncertain | -93.5% | -88.1% | -81.5% |
| Toggle sort over 500 rows | +62.2% | -10.0% uncertain | -11.6% uncertain | -57.1% |
| Toggle filter over 500 rows | +5.8% uncertain | +12.9% uncertain | +16.1% uncertain | -6.7% uncertain |

“Uncertain” means the process pairs or identical-source controls do not establish
a change at this precision. No small percentage is treated as a reliable win.

Equivalent presentation columns and flat-row accessor wrappers retain the data
model, so MRT rerenders do not reset the page. Real data/identity changes still
invalidate it. The cached-model fast path retains a measured win against the
app control on both runtimes and current Table 9 on Bun. The Node Table 9
cached-page identical-source control varied by 138%, so that comparison is
explicitly inconclusive despite every VPM pair being faster.

Node sorting still takes about 65 µs versus 40 µs for current Table 9. Bun
construction beats Table 9, and Bun sorting beats the app control. Filtering
and the remaining construction/sorting comparisons are inconclusive in this
recording. These measurements replace the pre-fix reports; they do not establish
that a prior regression was eliminated. No across-the-board speedup is claimed.

```sh
OUTPUT=packages/vtanstack-table-core/bench/results/node.json node packages/vtanstack-table-core/bench/compare.cjs
OUTPUT=packages/vtanstack-table-core/bench/results/bun.json bun packages/vtanstack-table-core/bench/compare.cjs
```
