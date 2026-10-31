# vgoogle-cloud-firestore-api measurements

Recorded October 31, 2026 on a shared Linux x64 VM (Intel Xeon @ 2.80 GHz) with
Node 22.22.0 and Bun 1.4.0, against @google-cloud/firestore-api 0.7.1 on
google-gax 6.14.0. Node 24 was not available on this machine. Each library uses
its own default gax stack, as an application would. Three fresh processes per
runtime, 12 alternating paired rounds per case, 150 ms warmup per variant plus
four full warmup blocks. Iterations use a 15 ms upstream pilot target capped at
100,000. Outputs are retained and validated outside timing. One additional
process per runtime compares identical upstream implementations. No trimming.

Each variant runs freshly compiled case code with its own measurement loop. The
second process on each runtime sets up VPM first; the others set up upstream
first.

Values are pooled median nanoseconds per operation. Changes are medians of paired
sample ratios. Negative means less time. Controls show identical-upstream drift.
The calls use an in-process transport that answers on a later microtask, so they
measure client and gax overhead, not network latency. Inputs are defined in
[the benchmark](../compare.cjs).

## Node 22

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| construct / FirestoreClient | 857,468 | 246,601 | -69.1% | -69.1%, -69.3%, -70.8% | -2.6% |
| construct / FirestoreAdminClient with operations | 2,436,741 | 799,869 | -64.7% | -71.1%, -66.2%, -61.5% | -0.9% |
| unary / getDocument | 10,606 | 9,834 | -6.5% | -13.6%, -26.6%, +29.0% | -24.7% |
| paged / listDocuments, 2 pages | 18,013 | 17,860 | +4.5% | +27.5%, +6.5%, -22.8% | +18.5% |
| server stream / runQuery, 10 results | 41,604 | 35,325 | -26.8% | -26.8%, +10.5%, -32.7% | -1.5% |
| error / status detail decoding | 13,780,998 | 90,613 | -99.4% | -99.4%, -99.4%, -99.4% | -3.6% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| construct / FirestoreClient | 629,390 | 116,460 | -79.8% | -79.8%, -79.2%, -81.6% | +1.1% |
| construct / FirestoreAdminClient with operations | 1,858,329 | 432,702 | -73.7% | -70.9%, -74.2%, -75.4% | +16.7% |
| unary / getDocument | 19,720 | 20,336 | +0.1% | +14.2%, -5.0%, -4.3% | +3.8% |
| paged / listDocuments, 2 pages | 30,290 | 32,731 | +1.1% | +3.8%, +6.1%, -13.8% | -1.1% |
| server stream / runQuery, 10 results | 55,217 | 53,504 | -3.7% | -1.9%, -5.9%, -1.9% | -3.9% |
| error / status detail decoding | 14,490,893 | 32,198 | -99.7% | -99.7%, -99.6%, -99.6% | +2.6% |

Construction and error decoding differ by far more than any control: upstream
hashes the 300 KB proto JSON on every construction and parses it on every error
that carries details. The three per-call cases go through the same gax call path
in both libraries. On Node their per-process results and controls vary by up to
±30%, so no difference is established; on Bun they are at parity.

## Cold start

`node packages/vgoogle-cloud-firestore-api/bench/import.cjs` (and the same with
Bun) imports each library in 15 fresh processes per library, alternating, then
constructs one `FirestoreClient`. Medians from the same machine:

| Runtime | Library | Import | Import and first client | Modules after import |
| --- | --- | ---: | ---: | ---: |
| Node 22 | upstream | 267.7 ms | 390.0 ms | 346 |
| Node 22 | VPM | 1.9 ms | 315.1 ms | 3 |
| Bun 1.4.0 | upstream | 281.8 ms | 495.2 ms | 347 |
| Bun 1.4.0 | VPM | 1.3 ms | 411.5 ms | 4 |

The first client loads the transport stack either way. An application that
imports the package but does not construct a client during startup, such as a
Cloud Function that reaches Firestore only on some requests, does not pay for it.

`node packages/vgoogle-cloud-firestore-api/bench/summarize.cjs --verify-current`
checks that all eight reports cover the same cases and that the recorded source
hashes match the current files.
