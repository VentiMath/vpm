# vgaxios benchmark results

Node 24.22.1 and Bun 1.4.0 on the recorded Apple Silicon host. Three fresh
processes per runtime, 12 alternating paired rounds per process, plus one
identical-upstream control. All raw samples, source hashes and runtime metadata
are retained beside this report. Lower operation time is better. Changes are
medians of paired ratios; they need not equal the ratio of the pooled medians.
No samples are trimmed. Outputs are retained and checked outside timing.

On Bun, upstream gaxios’s bare `node-fetch` import resolves to Bun’s built-in
compatibility module. Default HTTP rows retain that installed behavior. The
separate pinned Fetch 2 rows explicitly select the published node-fetch 2.7.0
bundle and vnode-fetch. These two baselines must not be conflated.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| client construction | 173 | 783 | 358.9% | 354.7%, 342.4%, 382.1% | 0.5% |
| adapter GET | 2902 | 3382 | 15.4% | 14.2%, 16.1%, 16.2% | 1.7% |
| adapter POST | 3451 | 3895 | 13.2% | 12.8%, 13.1%, 13.6% | 0.7% |
| HTTP /json | 100931 | 102206 | -0.6% | -3.1%, 0.7%, 2.2% | -3.9% |
| HTTP /gzip | 144123 | 149594 | 1.5% | 4.4%, 0.7%, -21.1% | 4.4% |
| pinned Fetch 2 /json | 95404 | 94579 | 1.3% | 7.2%, 2.2%, -2.1% | 6.5% |
| pinned Fetch 2 /gzip | 125642 | 125540 | 2.1% | -1.7%, 4.4%, 7.9% | 4.8% |
| HTTP JSON POST | 114901 | 115454 | 1.2% | -1.0%, 1.2%, 5.5% | -3.0% |
| HTTP multipart upload | 166704 | 153684 | -8.4% | -3.0%, -10.0%, -11.0% | 1.3% |
| HTTP 503 error | 110618 | 112442 | 2.9% | 4.4%, 2.9%, 1.0% | 3.0% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| client construction | 99 | 489 | 405.9% | 405.9%, 403.6%, 404.1% | 1.0% |
| adapter GET | 1756 | 1609 | -9.2% | -8.4%, -7.4%, -15.8% | -3.0% |
| adapter POST | 2090 | 1884 | -8.6% | -10.7%, -5.3%, -9.2% | 0.5% |
| HTTP /json | 61754 | 73620 | 14.0% | 6.3%, 29.0%, 7.5% | -4.2% |
| HTTP /gzip | 73602 | 108062 | 60.8% | 70.2%, 59.7%, 58.7% | 5.1% |
| pinned Fetch 2 /json | 87586 | 71186 | -13.7% | -16.5%, -16.1%, -10.3% | -1.6% |
| pinned Fetch 2 /gzip | 114919 | 96239 | -8.6% | -15.6%, -10.8%, -1.6% | -3.3% |
| HTTP JSON POST | 76435 | 89038 | 16.6% | 35.8%, 17.4%, 11.2% | 2.1% |
| HTTP multipart upload | 261618 | 136051 | -49.6% | -27.6%, -67.9%, -49.6% | -0.8% |
| HTTP 503 error | 88368 | 104792 | 19.1% | 26.5%, 2.3%, 21.3% | -3.4% |

Reproduce with `node packages/vgaxios/bench/compare.cjs` or `bun`, using
`OUTPUT` to save a report and `CALIBRATION=1` for the upstream control. Verify
all eight recorded files with `node packages/vgaxios/bench/summarize.cjs --verify-current`.
