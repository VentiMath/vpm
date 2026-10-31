# vfirebase-functions measurements

Recorded October 31, 2026 on a shared Linux x64 VM (Intel Xeon @ 2.80 GHz) with
Node 22.22.0 and Bun 1.4.0, against firebase-functions 7.4.0 on firebase-admin
14.5.0. Node 24 was not available on this machine. Three fresh processes per
runtime, 12 alternating paired rounds per case, 150 ms warmup per variant plus
four full warmup blocks. Iterations use a 15 ms upstream pilot target capped at
100,000. Outputs are retained and validated outside timing. One additional
process per runtime compares identical upstream implementations. No trimming.

Each variant runs freshly compiled case code with its own measurement loop. The
second process on each runtime sets up VPM first; the others set up upstream
first. Values are pooled median nanoseconds per operation. Changes are medians
of paired sample ratios. Negative means less time. Controls show
identical-upstream drift. Inputs (a Firestore `DocumentEventData` with seven
fields, including a map and a ten-element array of maps, and a callable request)
are defined in [the benchmark](../compare.cjs).

## Cold start

`node packages/vfirebase-functions/bench/import.cjs` (and the same with Bun)
starts 15 fresh processes per library, alternating. Each imports the `v2`
logger, then defines an HTTP, a callable, a scheduled, a task-queue and a
Firestore-triggered function with a secret, as a functions codebase does before
serving its first request. Medians from the same machine:

| Runtime | Library | `v2` (logger) import | Whole codebase | Modules |
| --- | --- | ---: | ---: | ---: |
| Node 22 | upstream | 477.4 ms | 481.4 ms | 663 |
| Node 22 | VPM | 16.0 ms | 41.7 ms | 57 |
| Bun 1.4.0 | upstream | 442.8 ms | 463.2 ms | 709 |
| Bun 1.4.0 | VPM | 29.3 ms | 58.4 ms | 58 |

Upstream's `v2` index loads every provider, and with them Firestore, a gax
stack, Auth, App Check and the Realtime Database client. Here those load when a
function first needs them; a Firestore trigger loads Firestore on its first
event.

## Node 22

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| firestore trigger / decode event into a snapshot | 14,382 | 12,157 | -13.9% | -15.3%, -11.1%, -13.5% | -5.0% |
| firestore trigger / decode and read data() | 30,480 | 25,936 | -13.5% | -13.2%, -10.3%, -16.7% | -1.2% |
| callable / validate and decode a request body | 609 | 629 | +1.3% | -0.8%, +2.3%, -3.4% | +1.7% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| firestore trigger / decode event into a snapshot | 13,697 | 16,578 | -13.1% | -11.2%, -18.4%, -0.2% | +15.0% |
| firestore trigger / decode and read data() | 27,635 | 21,053 | -21.1% | -27.3%, -22.4%, -21.1% | -5.8% |
| callable / validate and decode a request body | 696 | 652 | -0.4% | -2.6%, -3.8%, -0.4% | +5.3% |

Firestore trigger decoding runs through `vprotobufjs` and
`vgoogle-cloud-firestore`. Decoding and reading a document takes about 14% less
time on Node and 21% less on Bun, beyond the controls. Decoding alone takes 14%
less on Node; on Bun its control drifts 15%, so that case is inconclusive there.
Callable request handling is the SDK's own code and is at parity.

`node packages/vfirebase-functions/bench/summarize.cjs --verify-current` checks
that all eight reports cover the same cases and that the recorded source hashes
match the current files.
