# vmui-material measurements

Each timed
implementation runs alone in a fresh process. Four comparison pairs use
balanced upstream-first / VPM-first order; two further pairs run identical
upstream code in separate processes as controls. Warmup lasts at least 150 ms
per case, followed by recalibration on warmed code, four warmup blocks and 12
recorded blocks. Both workers in a pair use the same iteration count, targeting
10 ms blocks with a one-million-operation cap. Results are retained and checked
outside timing. All samples are kept, including outliers.

The comparison units are per-process medians. The change column is the median
of four process-pair percentage changes; the two order columns expose order
sensitivity. The nanosecond columns are medians of the four process medians.
They need not produce exactly the percentage in the change column.

A direction is unestablished when it reverses across processes or any pair
overlaps the largest absolute control difference (with a minimum 2% floor).
This is a conservative descriptive check, not a confidence interval. Process
isolation reduces shared JIT feedback; environmental noise and GC remain.
Negative changes mean less time; these are local workload measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-17T20:24:02.684Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 empty Autocomplete SSR | 1405111 | 1210142 | -10.4% | -26.9% | -4.4% | 18.8% | unestablished at this precision |
| Material9 selected Autocomplete SSR | 1623217 | 1444047 | -12.3% | -16.6% | -8.2% | 33.1% | unestablished at this precision |
| Material9 tags Autocomplete SSR | 2184085 | 2126808 | -0.5% | -22.2% | 3.7% | 53.3% | unestablished at this precision |
| App7 empty Autocomplete SSR | 1193677 | 1154765 | -3.1% | -3.1% | 21.9% | 24.3% | unestablished at this precision |
| App7 selected Autocomplete SSR | 1511019 | 1373902 | -10.3% | -10.3% | -10.3% | 5.9% | unestablished at this precision |
| App7 tags Autocomplete SSR | 2029948 | 2295063 | 12.1% | 8% | 39.1% | 12.2% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-17T20:24:34.114Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 empty Autocomplete SSR | 887822 | 741010 | -14.6% | -12.8% | -16.7% | 12.6% | unestablished at this precision |
| Material9 selected Autocomplete SSR | 1033637 | 884646 | -14.7% | -14.7% | 0.6% | 16.6% | unestablished at this precision |
| Material9 tags Autocomplete SSR | 1537592 | 1356091 | -9.4% | -12.2% | -8.6% | 3.4% | unestablished at this precision |
| App7 empty Autocomplete SSR | 849868 | 731067 | -11.7% | -11.7% | -15.2% | 8.7% | unestablished at this precision |
| App7 selected Autocomplete SSR | 904102 | 880408 | -2.2% | 2.7% | -3.3% | 11.1% | unestablished at this precision |
| App7 tags Autocomplete SSR | 1271040 | 1340809 | 2.2% | 9.4% | 1.3% | 14.1% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/autocomplete.cjs:

```sh
OUTPUT=packages/vmui-material/bench/autocomplete/node-isolated.json node packages/vmui-material/bench/autocomplete.cjs
OUTPUT=packages/vmui-material/bench/autocomplete/bun-isolated.json bun packages/vmui-material/bench/autocomplete.cjs
node scripts/render-bench-report.cjs packages/vmui-material autocomplete autocomplete.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
