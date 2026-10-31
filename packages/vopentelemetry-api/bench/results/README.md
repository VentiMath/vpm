# OpenTelemetry API measurements

Compare @opentelemetry/api 1.10.0 with vopentelemetry-api on Node 24 and Bun.
The shared runner retains outputs and validates them outside timing, warms each
variant for 150 ms and four full blocks, then records twelve alternating paired
rounds. Three fresh processes and one identical-upstream control per runtime;
no trimming. Raw reports record runtime, machine and source hashes.

Trace states contain 1, 8 or 32 entries. Repeated serialization reuses an already
serialized immutable object. Update tests replace an existing entry in an
eight-entry state; baggage tests use eight string-valued records. The gax case
calls the actual 6.14.0 request and attempt tracing helpers with SDK 3.0.0 and an
AsyncLocalStorage context manager. The SDK records spans without an exporter;
there is no network call or cloud latency in that benchmark.

```sh
OUTPUT=packages/vopentelemetry-api/bench/results/node-1.json node packages/vopentelemetry-api/bench/compare.cjs
# Repeat in fresh processes for node-2/node-3; use bun for bun-1/bun-2/bun-3.
CALIBRATION=1 OUTPUT=packages/vopentelemetry-api/bench/results/node-control.json node packages/vopentelemetry-api/bench/compare.cjs
# Repeat the control with bun, then verify all retained reports:
node packages/vopentelemetry-api/bench/summarize.cjs --verify-current
```

Recorded October 30, 2026 (local date), Apple M1 Pro, Node 24.22.1 and Bun 1.4.0.
Times below are pooled median nanoseconds per operation. Changes are median
paired ratios, so they need not equal ratios of pooled times. Negative means
less time. Process columns retain each fresh process's median; controls compare
identical upstream implementations.

## Node

| Workload | Upstream ns | VPM ns | Paired change | Process medians | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| trace state / parse and serialize 1 | 281 | 272 | -2.9% | -2.3%, -3.1%, -2.9% | -0.1% |
| trace state / repeated serialize 1 | 87 | 6 | -92.8% | -92.8%, -92.9%, -92.8% | -0.0% |
| trace state / parse and serialize 8 | 1,697 | 1,674 | -1.2% | -0.4%, -2.1%, -1.2% | +0.8% |
| trace state / repeated serialize 8 | 414 | 6 | -98.5% | -98.5%, -98.5%, -98.5% | -0.3% |
| trace state / parse and serialize 32 | 7,070 | 6,885 | -2.5% | -2.6%, -4.4%, -1.6% | -0.3% |
| trace state / repeated serialize 32 | 1,623 | 6 | -99.6% | -99.6%, -99.6%, -99.6% | -0.6% |
| trace state / update and serialize 8 | 1,327 | 889 | -33.1% | -32.6%, -34.1%, -32.4% | +0.5% |
| baggage / create 8 | 837 | 536 | -36.0% | -35.3%, -35.7%, -36.4% | -0.5% |
| baggage / set entry among 8 | 342 | 361 | +5.4% | +5.1%, +5.9%, +4.9% | -0.4% |
| baggage / enumerate 8 | 333 | 164 | -51.2% | -51.4%, -47.6%, -51.6% | -0.6% |
| baggage / get one entry | 49 | 19 | -60.3% | -60.6%, -61.1%, -58.4% | -0.3% |
| context / update and read | 103 | 104 | +0.8% | +1.7%, -0.1%, +2.3% | +0.1% |
| gax / real SDK call and attempt spans | 6,256 | 6,273 | +2.6% | +13.5%, +0.6%, +0.6% | -2.8% |

Raw reports: [1](node-1.json), [2](node-2.json), [3](node-3.json), [control](node-control.json).

## Bun

| Workload | Upstream ns | VPM ns | Paired change | Process medians | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| trace state / parse and serialize 1 | 231 | 163 | -27.4% | -27.4%, -13.6%, -20.3% | +0.0% |
| trace state / repeated serialize 1 | 77 | 4 | -95.3% | -95.3%, -95.4%, -95.3% | +3.1% |
| trace state / parse and serialize 8 | 1,329 | 1,322 | +0.1% | +0.5%, -3.2%, +1.0% | +0.3% |
| trace state / repeated serialize 8 | 326 | 4 | -98.9% | -97.9%, -98.9%, -98.9% | +0.3% |
| trace state / parse and serialize 32 | 6,127 | 6,407 | +5.3% | +8.7%, +5.4%, +3.2% | -2.7% |
| trace state / repeated serialize 32 | 1,278 | 8 | -99.4% | -99.4%, -99.4%, -99.4% | +1.0% |
| trace state / update and serialize 8 | 766 | 534 | -29.6% | -31.6%, -29.6%, -29.3% | +2.3% |
| baggage / create 8 | 638 | 574 | -9.6% | -10.0%, -13.9%, -9.1% | -0.8% |
| baggage / set entry among 8 | 138 | 156 | +12.7% | +3.2%, +7.3%, +16.4% | +5.1% |
| baggage / enumerate 8 | 125 | 294 | +133.8% | +134.7%, +113.4%, +140.8% | +1.7% |
| baggage / get one entry | 54 | 32 | -41.4% | -36.8%, -43.8%, -43.6% | -0.5% |
| context / update and read | 80 | 74 | -2.4% | -3.8%, -1.1%, -11.6% | -1.6% |
| gax / real SDK call and attempt spans | 3,349 | 3,178 | -5.1% | -3.3%, -5.9%, -5.1% | -6.7% |

Raw reports: [1](bun-1.json), [2](bun-2.json), [3](bun-3.json), [control](bun-control.json).

## Interpretation

- Reusing serialized trace state takes **93–99.6% less time**, reducing the measured
  operation to about 4–8 ns. Updating and serializing eight entries takes **33%
  less on Node and 30% less on Bun**, despite validating the update.
- Baggage construction takes **36% less time on Node and 10% less on Bun**, with
  input records now isolated. Single-entry reads take **60% / 41% less**. Node
  enumeration takes **51% less**, including the required entry copies.
- Costs remain: setting a baggage entry takes **5% more on Node and 13% more on
  Bun**, about 19 / 18 additional ns. Bun enumeration takes **134% more**, about
  169 additional ns for eight isolated records. Upstream returns references to
  its internal records, so that faster path does not provide equivalent isolation.
- Parsing and serializing the maximum 32 entries takes **5% more on Bun** (about
  280 ns), while repeat serialization of that object is much faster. Node's
  first-parse changes are small; Bun's one-entry case improves across all runs,
  while its eight-entry change is inconclusive.
- Full gax tracing results are **inconclusive**: Node's +2.6% overlaps its 2.8%
  control movement and one process varies by +13.5%; Bun's -5.1% is smaller than
  its -6.7% control movement. No overall SDK or cloud request speedup is claimed.
  Context updates retain upstream's implementation and show no clear change.

An exploratory enumeration variant using `Array.from` followed by entry copies
was tested locally but discarded: it substantially worsened Node timings for a
small Bun gain. The retained reports all use the final implementation and include
all measured cases; no runs were removed or trimmed.
