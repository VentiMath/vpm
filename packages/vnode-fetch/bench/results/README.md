# vnode-fetch benchmark results

Comparison baseline: published node-fetch **2.7.0**. These measurements retain
that API baseline; the separate Gaxios 7/8 caller checks against Fetch 3 do not
change this benchmark's comparison target.

Node 24.22.1 and Bun 1.4.0 on the recorded Apple Silicon host. Three fresh
processes per runtime, 12 alternating paired rounds per process, plus one
identical-upstream control. All raw samples, source hashes and runtime metadata
are retained beside this report. Lower operation time is better. Changes are
medians of paired ratios; they need not equal the ratio of the pooled medians.
No samples are trimmed. Outputs are retained and checked outside timing.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| Response construction | 317 | 306 | -3.1% | 1.8%, -1.1%, -7.7% | -1.5% |
| JSON body | 928 | 924 | -1.4% | -2.0%, 1.3%, -1.4% | -1.1% |
| malformed JSON | 7851 | 7757 | -0.5% | -0.3%, -0.8%, -0.6% | -1.8% |
| 32-chunk 16KiB body | 4532 | 7635 | 66.7% | 92.5%, 61.0%, 64.4% | -0.8% |
| HTTP /json | 116378 | 113362 | 1.4% | 2.9%, 2.9%, -2.9% | 4.9% |
| HTTP /gzip | 149867 | 151048 | -0.8% | -4.5%, -0.6%, 4.9% | -12.9% |
| HTTP streamed POST | 132855 | 131364 | 0.8% | 0.2%, 1.7%, -0.1% | -0.4% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| Response construction | 278 | 277 | 1.3% | -1.5%, 4.6%, 0.9% | 0.9% |
| JSON body | 716 | 705 | -1.3% | -1.5%, -1.0%, -1.8% | 2.3% |
| malformed JSON | 2130 | 2156 | 2.5% | 6.4%, -1.9%, -1.9% | 3.4% |
| 32-chunk 16KiB body | 4690 | 7593 | 70.2% | 66.7%, 82.6%, 69.5% | -3.2% |
| HTTP /json | 109144 | 90638 | -14.3% | -17.2%, -17.7%, -13.8% | -1.8% |
| HTTP /gzip | 156383 | 146618 | -7.3% | -11.0%, -5.8%, -5.1% | 2.3% |
| HTTP streamed POST | 117740 | 112881 | -8.7% | -8.7%, -12.0%, -7.1% | -3.7% |

Node HTTP changes are small relative to process/control variation; they do not
establish a speed improvement. Bun HTTP medians favor VPM in these local cases.
The safe 32-chunk collector remains slower because it copies emitted chunks to
preserve producer-reused bytes and tracks stream cleanup. These measurements do
not establish production throughput or the performance of native Fetch.

Reproduce with `node packages/vnode-fetch/bench/compare.cjs` or `bun`, using
`OUTPUT` to save a report and `CALIBRATION=1` for the upstream control. Verify
all eight recorded files with `node packages/vnode-fetch/bench/summarize.cjs --verify-current`.
