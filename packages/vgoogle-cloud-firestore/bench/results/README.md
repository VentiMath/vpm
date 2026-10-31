# vgoogle-cloud-firestore measurements

Recorded October 31, 2026 on a shared Linux x64 VM (Intel Xeon @ 2.80 GHz) with
Node 22.22.0 and Bun 1.4.0, against @google-cloud/firestore 9.4.0 with its own
dependencies. Node 24 was not available on this machine. Three fresh processes
per runtime, 12 alternating paired rounds per case, 150 ms warmup per variant
plus four full warmup blocks. Iterations use a 15 ms upstream pilot target
capped at 100,000. Outputs are retained and validated outside timing. One
additional process per runtime compares identical upstream implementations. No
trimming.

Each variant runs freshly compiled case code with its own measurement loop. The
second process on each runtime sets up VPM first; the others set up upstream
first. Values are pooled median nanoseconds per operation. Changes are medians
of paired sample ratios. Negative means less time. Controls show
identical-upstream drift. Inputs are defined in [the benchmark](../compare.cjs).

## Cold start

`node packages/vgoogle-cloud-firestore/bench/import.cjs` (and the same with Bun)
starts 15 fresh processes per library, alternating. Each imports Firestore,
then constructs a client and encodes a document (no network). Medians from the
same machine:

| Runtime | Library | Import | Import, client and first encode | Modules after import |
| --- | --- | ---: | ---: | ---: |
| Node 22 | upstream | 266.0 ms | 268.4 ms | 404 |
| Node 22 | VPM | 48.2 ms | 69.9 ms | 65 |
| Bun 1.4.0 | upstream | 313.4 ms | 316.3 ms | 405 |
| Bun 1.4.0 | VPM | 84.1 ms | 112.4 ms | 66 |

Upstream loads @google-cloud/firestore-api 0.2.0 at import, and with it a
complete google-gax 5 stack, protobufjs and the static protos. Here those load
when a request first needs them; the transport stack still loads before the
first request is sent.

## Node 22

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| encode / 12-field document | 7,461 | 7,732 | +4.1% | +5.9%, +5.0%, -1.8% | +1.6% |
| decode / snapshot data() of 12-field document | 11,321 | 11,609 | +2.1% | +0.0%, +4.0%, +2.4% | +0.7% |
| write / batch set merge with transforms | 76,894 | 78,014 | +0.4% | -0.9%, +4.7%, -1.4% | -3.0% |
| query / where, orderBy, limit to proto | 5,327 | 5,906 | +1.6% | +1.8%, +0.2%, +0.6% | +0.9% |
| compare / isEqual of equal snapshots | 79 | 87 | +8.3% | +15.2%, +7.6%, +6.4% | +15.0% |
| timestamp / fromMillis, toDate, valueOf | 136 | 138 | +4.2% | +1.2%, +4.6%, +9.4% | -0.7% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| encode / 12-field document | 15,456 | 14,345 | -5.4% | -10.1%, +7.9%, -16.4% | +5.4% |
| decode / snapshot data() of 12-field document | 7,944 | 8,766 | +1.4% | -6.2%, -0.2%, +11.2% | -3.8% |
| write / batch set merge with transforms | 54,768 | 54,934 | -1.0% | -2.5%, -0.4%, +1.2% | +0.4% |
| query / where, orderBy, limit to proto | 5,519 | 5,378 | -3.7% | -10.9%, -4.3%, +1.9% | -2.3% |
| compare / isEqual of equal snapshots | 136 | 134 | -18.0% | -26.8%, +10.0%, -18.4% | -2.5% |
| timestamp / fromMillis, toDate, valueOf | 137 | 122 | -12.6% | -22.3%, +6.3%, -15.6% | +7.3% |

The document and query code is upstream's, so per-operation CPU is expected at
parity: differences come from the VPM dependencies (protobuf, deep equality).
On Node all cases are within about 5% of upstream and of the control drift; the
sub-100 ns `isEqual` case drifts 15% in its own control. Bun's per-process
results spread further in both directions. No per-operation difference is
established on either runtime.

`node packages/vgoogle-cloud-firestore/bench/summarize.cjs --verify-current`
checks that all eight reports cover the same cases and that the recorded source
hashes match the current files.
