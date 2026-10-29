# vnode-fetch benchmark results

Node 24.22.1 and Bun 1.4.0 on the recorded Apple Silicon host. Three fresh
processes per runtime, 12 alternating paired rounds per process, plus one
identical-upstream control. All raw samples, source hashes and runtime metadata
are retained beside this report. Lower operation time is better. Changes are
medians of paired ratios; they need not equal the ratio of the pooled medians.
No samples are trimmed. Outputs are retained and checked outside timing.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| Response construction | 390 | 419 | 12.6% | 6.7%, -4.4%, 43.9% | -1.2% |
| JSON body | 928 | 986 | 0.7% | 0.3%, 5.5%, -0.1% | -0.1% |
| malformed JSON | 8244 | 7866 | -4.2% | -5.1%, -4.9%, -4.2% | -0.1% |
| 32-chunk 16KiB body | 5208 | 8647 | 68.4% | 60.5%, 98.4%, 63.3% | 19.9% |
| HTTP /json | 120145 | 121756 | 1.3% | -0.6%, 8.7%, 1.3% | 0.2% |
| HTTP /gzip | 220506 | 227704 | 3.6% | 14.9%, 7.6%, 3.6% | -3.3% |
| HTTP streamed POST | 244558 | 276005 | 6.7% | 7.8%, 25.3%, 3.6% | -4.6% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| Response construction | 284 | 275 | -8.7% | -14.6%, -8.7%, -16.6% | -1.7% |
| JSON body | 691 | 689 | -0.3% | -1.5%, 5.6%, -1.0% | -3.2% |
| malformed JSON | 2437 | 2386 | 6.4% | -5.8%, 6.0%, 11.7% | 1.6% |
| 32-chunk 16KiB body | 6038 | 8388 | 50.8% | 52.8%, 85.0%, 29.2% | -0.6% |
| HTTP /json | 96214 | 86150 | -8.2% | -6.9%, -28.8%, -1.3% | 4.6% |
| HTTP /gzip | 148661 | 139899 | -5.5% | -12.5%, -7.1%, 2.9% | 30.8% |
| HTTP streamed POST | 156619 | 134562 | -14.4% | -16.4%, -10.0%, -12.0% | -3.6% |

Reproduce with `node packages/vnode-fetch/bench/compare.cjs` or `bun`, using
`OUTPUT` to save a report and `CALIBRATION=1` for the upstream control. Verify
all eight recorded files with `node packages/vnode-fetch/bench/summarize.cjs --verify-current`.
