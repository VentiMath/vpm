# vextend benchmark results

Node 24.22.1 and Bun 1.4.0 on the recorded Apple Silicon host. Three fresh
processes per runtime, 12 alternating paired rounds per process, plus one
identical-upstream control. All raw samples, source hashes and runtime metadata
are retained beside this report. Lower operation time is better. Changes are
medians of paired ratios; they need not equal the ratio of the pooled medians.
No samples are trimmed. Outputs are retained and checked outside timing.

Rows prefixed upstream compare extend 3.0.2 against current VPM. Rows prefixed
previous VPM compare the verbatim implementation from commit 3e4348a, saved in
bench/previous.cjs, against current VPM. The shared harness calls the reference
column upstream in both groups; each control compares that row’s baseline to itself.
Bun shallow and HTTP-option results are inconclusive across processes; the latter
control also shows severe tiering variation. No stable gain is claimed there.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| upstream / shallow three fields | 96 | 207 | 112.7% | 126.4%, 110.3%, 108.3% | -0.3% |
| upstream / deep three fields | 125 | 203 | 60.0% | 59.5%, 61.7%, 48.9% | 0.2% |
| upstream / deep HTTP options | 855 | 953 | 10.3% | 5.3%, 9.1%, 12.4% | 1.2% |
| upstream / deep 50 records | 30942 | 38452 | 36.4% | 43.4%, 35.4%, 32.9% | -0.1% |
| previous VPM / shallow three fields | 208 | 184 | -11.7% | -18.8%, -10.3%, -8.3% | -0.5% |
| previous VPM / deep three fields | 359 | 229 | -29.4% | -28.9%, -48.1%, -28.4% | 1.5% |
| previous VPM / deep HTTP options | 1516 | 1054 | -22.0% | -24.2%, -18.5%, -21.7% | -2.8% |
| previous VPM / deep 50 records | 40835 | 34543 | -12.0% | -9.7%, -20.8%, -11.2% | -7.5% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| upstream / shallow three fields | 60 | 72 | 18.6% | 21.9%, 17.4%, 10.2% | -0.5% |
| upstream / deep three fields | 142 | 125 | -20.1% | -10.9%, -40.9%, -19.3% | 0.5% |
| upstream / deep HTTP options | 508 | 548 | -15.2% | 84.3%, -31.6%, -15.2% | -0.7% |
| upstream / deep 50 records | 26511 | 23480 | -10.9% | -9.8%, -13.0%, -8.7% | 1.4% |
| previous VPM / shallow three fields | 84 | 88 | 5.0% | 2.2%, 49.2%, -2.5% | 1.4% |
| previous VPM / deep three fields | 164 | 109 | -33.4% | -30.6%, -35.2%, -36.1% | 0.8% |
| previous VPM / deep HTTP options | 570 | 675 | -8.2% | 70.5%, -42.2%, -18.2% | 142.1% |
| previous VPM / deep 50 records | 26628 | 23907 | -9.5% | -4.4%, -21.9%, -9.6% | -1.6% |

Reproduce with `node packages/vextend/bench/compare.cjs` or `bun`, using
`OUTPUT` to save a report and `CALIBRATION=1` for the upstream control. Verify
all eight recorded files with `node packages/vextend/bench/summarize.cjs --verify-current`.
