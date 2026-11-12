# vmotion-dom measurements

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

Recorded 2026-11-12T19:16:28.506Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| complete and release 1 custom values | 5119 | 6075 | 8.4% | 7.9% | 34.6% | 20.2% | unestablished at this precision |
| complete and release 1 custom values with transitionEnd | 6023 | 9296 | 40.7% | 29.5% | 57% | 13.9% | higher time in every pair, beyond control spread |
| complete and release 8 custom values | 23003 | 29087 | 12.2% | 29.7% | -9.3% | 32.8% | unestablished at this precision |
| complete and release 8 custom values with transitionEnd | 26088 | 30456 | 16.8% | 14.6% | 16.8% | 10.3% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-12T19:16:46.063Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| complete and release 1 custom values | 3755 | 5024 | 35.7% | 35.9% | 33.9% | 8% | higher time in every pair, beyond control spread |
| complete and release 1 custom values with transitionEnd | 4673 | 6208 | 39.6% | 41.6% | 32.1% | 14.9% | higher time in every pair, beyond control spread |
| complete and release 8 custom values | 19341 | 20807 | 7.2% | -15.3% | 17.3% | 15.5% | unestablished at this precision |
| complete and release 8 custom values with transitionEnd | 21939 | 23892 | 8.9% | 8.1% | 8.9% | 70.5% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/effect-end.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/effect-end/node-isolated.json node packages/vmotion-dom/bench/effect-end.cjs
OUTPUT=packages/vmotion-dom/bench/effect-end/bun-isolated.json bun packages/vmotion-dom/bench/effect-end.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom effect-end effect-end.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

## Scope and remaining costs

Each operation constructs controllers, completes one or eight custom values,
drains microtasks/manual frames, checks final values, stops controllers and
releases bindings. The end-value cases overwrite an animated property and set
one previously unbound property. This measures CPU setup/completion, not browser
frame rate.

The bounded follow-up walks the fixed private key/value collections directly
instead of allocating two collection snapshots at each ownership check. Every
generation, lifecycle, binding and animation-request guard remains in place,
including the check before each reentrant end write. This comparison is against
upstream, not an isolated before/after attribution to the loop change.

One-property completion with ends is still slower: +40.7% on Node and +39.6% on
Bun. Bun completion without ends is +35.7%. Other directions are unestablished
because of pair/control variation; no general speedup is claimed. The earlier
recordings are available in git history; [the initial Node recording](node-initial.json)
is retained as historical evidence. Motion remains partial and parked.
