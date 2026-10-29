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
| client construction | 182 | 720 | 290.8% | 275.1%, 339.5%, 277.0% | 0.4% |
| adapter GET | 3151 | 3332 | 7.8% | 4.4%, 6.3%, 9.7% | -0.9% |
| adapter POST | 3621 | 3781 | 4.1% | -3.9%, 5.7%, 8.4% | 1.4% |
| HTTP /json | 165969 | 181494 | 6.9% | 0.6%, 15.1%, 17.6% | 4.4% |
| HTTP /gzip | 197745 | 218049 | -2.3% | 4.9%, -5.8%, 28.2% | 6.1% |
| pinned Fetch 2 /json | 141510 | 129123 | 0.6% | -6.9%, 3.5%, -9.4% | -2.9% |
| pinned Fetch 2 /gzip | 147939 | 151789 | -4.1% | -1.1%, -2.6%, -4.8% | -14.7% |
| HTTP JSON POST | 120880 | 123194 | -1.2% | -3.6%, 6.1%, -2.5% | 3.3% |
| HTTP multipart upload | 180419 | 161320 | -12.8% | -11.9%, -13.7%, -12.6% | 3.7% |
| HTTP 503 error | 143215 | 137732 | -1.1% | 0.6%, -9.1%, 5.5% | 1.4% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| client construction | 91 | 364 | 299.6% | 326.4%, 296.5%, 295.2% | 0.4% |
| adapter GET | 1725 | 1374 | -19.9% | -16.1%, -22.5%, -19.7% | 0.7% |
| adapter POST | 2049 | 1732 | -16.3% | -15.7%, -12.9%, -19.8% | 1.2% |
| HTTP /json | 75038 | 83658 | 13.7% | 22.6%, 13.3%, 12.1% | -1.0% |
| HTTP /gzip | 83962 | 135489 | 56.0% | 75.9%, 62.2%, 30.3% | 3.3% |
| pinned Fetch 2 /json | 97572 | 85861 | -9.2% | -13.0%, -6.2%, -8.0% | -4.1% |
| pinned Fetch 2 /gzip | 146996 | 136460 | -12.1% | -13.4%, -10.9%, -15.3% | -2.1% |
| HTTP JSON POST | 84812 | 100719 | 15.5% | 16.5%, 18.3%, 13.3% | 0.2% |
| HTTP multipart upload | 284212 | 141941 | -50.2% | -46.3%, -50.3%, -53.1% | -2.0% |
| HTTP 503 error | 91065 | 103832 | 20.0% | 20.0%, 19.3%, 16.8% | 4.2% |

Reproduce with `node packages/vgaxios/bench/compare.cjs` or `bun`, using
`OUTPUT` to save a report and `CALIBRATION=1` for the upstream control. Verify
all eight recorded files with `node packages/vgaxios/bench/summarize.cjs --verify-current`.
