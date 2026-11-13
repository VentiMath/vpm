# vscheduler measurements

The first three workloads use the same deterministic timer/message host in the
native JavaScript realm for both implementations. VM isolation is used for
correctness checks, not timings: VM global-property lookup costs distort these
small scheduler operations. The fourth case uses the runtime's real event loop.
Every case drains its work between iterations. Source loading and callback
construction are outside timing; task creation, queuing and cleanup are inside.

The recording environment was under variable load. Identical-source controls
show large variation; interpret the evidence column, not a median percentage in
isolation. These recordings do not establish an application speed improvement.

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

Recorded 2026-11-13T19:59:37.498Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| schedule and drain 32 mixed-priority callbacks | 3594 | 2589 | -21.5% | -16.5% | -25.2% | 69.5% | unestablished at this precision |
| schedule and cancel 32 delayed callbacks | 4849 | 1749 | -45.8% | -44.8% | -48.4% | 92.5% | unestablished at this precision |
| drain 16 two-stage continuations | 6234 | 4143 | -19.8% | 37.8% | -38% | 183.9% | unestablished at this precision |
| real host batch of 32 callbacks | 35657 | 32446 | 14% | 14% | 22.7% | 282.6% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-13T19:59:55.880Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| schedule and drain 32 mixed-priority callbacks | 1753 | 2151 | 33.2% | 35.2% | 6.9% | 45.9% | unestablished at this precision |
| schedule and cancel 32 delayed callbacks | 1813 | 2697 | 48.8% | 31.3% | 48.8% | 27.1% | unestablished at this precision |
| drain 16 two-stage continuations | 1374 | 2999 | 107.2% | 107.2% | 97.9% | 699.9% | unestablished at this precision |
| real host batch of 32 callbacks | 9731 | 5629 | -36.4% | -34% | -36.4% | 95.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vscheduler/bench/results/node-isolated.json node packages/vscheduler/bench/run.cjs
OUTPUT=packages/vscheduler/bench/results/bun-isolated.json bun packages/vscheduler/bench/run.cjs
node scripts/render-bench-report.cjs packages/vscheduler results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
