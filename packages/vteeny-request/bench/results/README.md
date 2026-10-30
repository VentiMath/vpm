# vteeny-request measurements

Published teeny-request 11.1.1 versus VPM on Node 24.22.1 and Bun 1.4.0,
recorded October 29, 2026 on the machine described in each report. These are
local HTTP experiments, not production latency predictions.

Three fresh processes per runtime, 12 alternating paired rounds after warmup,
plus an identical-upstream control. No samples are trimmed. Outputs are retained
and checked outside timing. The [shared runner](../../../../scripts/bench-paired.cjs)
records runtime metadata, workload code, runtime source hashes and the pinned
upstream fixture lockfile. All eight reports use the same source hashes.

**Interpretation:** both runtimes show a large proxy benefit, especially when
`forever` can reuse TLS connections. Upstream ignores `forever` for proxy agents;
VPM caches the agent and honors keep-alive. This is a connection-lifecycle
improvement, not a claim that TLS cryptography itself became faster.

Node request medians favor VPM. Several direct-request controls are noisy,
including a 49.5% multipart control imbalance, so their exact speedups are
provisional. Bun direct callbacks retain overhead relative to upstream's small
Bun-specific HTTP implementation; shared Fetch normalization, option isolation
and cancellation/limit handling remain in VPM. Direct callback decoding avoids
an additional copy of each byte chunk. Bun upload/download results cross zero
between processes and do not establish a reliable improvement.

Creating defaults is slower because VPM snapshots and validates configuration;
upstream merely closes over the original object. This costs roughly 2 µs on
Node and 0.5 µs on Bun in this run and is separate from request timing.

Changes below are medians of paired VPM/upstream ratios. The µs column is the
median paired time difference; process ranges contain each fresh process's
median percentage. A negative value means less time. Controls compare upstream
with itself and show timing uncertainty; they are not subtracted from results.

## Node 24

| Workload | Paired change | Difference, µs | Three process medians | Control |
| --- | ---: | ---: | --- | ---: |
| create defaults | +8308.4% | +1.99 | +8239.9%, +8007.9%, +9830.1% | +5.1% |
| text callback | -32.3% | -84.79 | -28.9%, -45.9%, -22.6% | +13.3% |
| json callback | -29.9% | -56.30 | -28.7%, -26.9%, -34.4% | +17.2% |
| gzip callback | -36.5% | -127.13 | -36.5%, -30.0%, -40.6% | +18.8% |
| JSON POST callback | -32.3% | -101.53 | -28.8%, -27.9%, -33.1% | -16.5% |
| query + headers callback | -23.1% | -40.74 | -15.2%, -26.3%, -4.0% | -1.5% |
| malformed JSON callback | -15.7% | -26.56 | -23.4%, -11.8%, -14.0% | -2.2% |
| 64KiB streamed download | -13.6% | -39.35 | -6.8%, -21.0%, -37.3% | +20.0% |
| 64KiB multipart upload | -21.0% | -65.26 | -16.2%, -23.4%, -16.9% | +49.5% |
| eight concurrent JSON callbacks | -20.7% | -251.29 | -23.8%, -23.4%, -20.1% | +2.2% |
| HTTP proxy forever callback | -54.9% | -387.65 | -58.7%, -57.8%, -48.1% | +7.9% |
| TLS proxy forever callback | -94.3% | -6774.92 | -94.4%, -94.1%, -93.3% | +4.2% |

Reports: [node-1.json](node-1.json), [node-2.json](node-2.json), [node-3.json](node-3.json), [node-control.json](node-control.json).

## Bun

| Workload | Paired change | Difference, µs | Three process medians | Control |
| --- | ---: | ---: | --- | ---: |
| create defaults | +1895.0% | +0.48 | +2248.2%, +1691.2%, +1182.4% | +10.3% |
| text callback | +17.1% | +16.94 | +27.7%, +9.1%, +17.1% | +6.5% |
| json callback | +15.8% | +13.11 | +14.2%, +22.6%, +16.2% | -7.6% |
| gzip callback | +11.8% | +24.03 | +12.7%, +25.1%, +5.3% | +2.0% |
| JSON POST callback | +6.6% | +13.91 | +22.0%, -3.8%, +7.8% | +15.2% |
| query + headers callback | +22.5% | +23.80 | +32.0%, +40.5%, +19.6% | -0.7% |
| malformed JSON callback | +16.4% | +13.95 | +19.3%, -10.3%, +18.2% | +3.4% |
| 64KiB streamed download | -6.5% | -11.69 | -6.4%, -19.1%, +14.6% | -1.9% |
| 64KiB multipart upload | +2.7% | +5.76 | +12.5%, -4.2%, +18.2% | -7.9% |
| eight concurrent JSON callbacks | +16.5% | +75.83 | +19.9%, +8.6%, +23.2% | +3.8% |
| HTTP proxy forever callback | -36.7% | -155.24 | -42.0%, -31.7%, -34.6% | +5.6% |
| TLS proxy forever callback | -93.8% | -5829.93 | -93.4%, -93.7%, -95.2% | -0.2% |

Reports: [bun-1.json](bun-1.json), [bun-2.json](bun-2.json), [bun-3.json](bun-3.json), [bun-control.json](bun-control.json).

## Reproduce

Install the workspace and the pinned teeny conformance fixture first. Run each
benchmark process sequentially, without concurrent tests or other heavy work.
The local TLS proxy uses the same fixture trust override on both sides.

```sh
OUTPUT=packages/vteeny-request/bench/results/node-1.json node packages/vteeny-request/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vteeny-request/bench/results/node-control.json node packages/vteeny-request/bench/compare.cjs
```

Repeat for runs 2/3 and with `bun`. Validate all reports and current hashes:

```sh
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vteeny-request'))" -- --verify-current
```
