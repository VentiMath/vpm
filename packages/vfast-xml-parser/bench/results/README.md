# XML parser benchmarks

Comparison target: fast-xml-parser 5.11.2 ESM source with the locked current helpers.
Node 24 and Bun results are recorded separately. Published CJS/source ESM behavior
is compared on seven selected cases in the conformance fixture; timing here uses ESM.

The shared paired harness uses 150 ms warmup per implementation, four full warmup
blocks, then 12 alternating paired rounds. It targets 15 ms per upstream block,
capped at 100,000 operations, retains results and checks them outside timing.
Three fresh processes plus an identical-upstream control run on each runtime.
No samples are trimmed. Raw JSON retains runtime/CPU details, source hashes,
per-round timings and the input/output checks are in `../compare.cjs`.

Recorded October 30, 2026 on Apple M1 Pro, macOS arm64, Node 24.22.1 and Bun 1.4.0.
Percentages are pooled medians of paired ratios. Time columns are pooled medians;
their quotient need not equal the paired percentage. Positive values mean more time.

## Node

| Case | Upstream ns | VPM ns | Time change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| construct default parser | 1,440 | 31 | -97.8% | -97.8%, -97.8%, -97.8% | +1.0% |
| construct configured parser | 1,472 | 354 | -76.0% | -75.7%, -76.2%, -76.0% | +0.5% |
| Storage fresh initiation string | 10,504 | 7,125 | -32.0% | -32.7%, -31.4%, -32.0% | +0.4% |
| Storage fresh initiation Buffer | 10,842 | 7,427 | -31.6% | -32.8%, -30.8%, -30.7% | +1.1% |
| reused initiation parser | 8,973 | 6,322 | -29.6% | -30.4%, -28.6%, -29.6% | +0.2% |
| 128 listed parts | 850,078 | 568,637 | -33.2% | -35.3%, -32.4%, -32.9% | -0.2% |
| attributes and numbers | 5,039 | 3,295 | -33.7% | -35.2%, -33.0%, -35.0% | +0.3% |
| 8 KiB text with entities | 111,717 | 5,553 | -94.9% | -94.9%, -94.9%, -95.1% | -0.8% |
| ordered mixed text | 3,728 | 2,111 | -43.3% | -44.5%, -40.8%, -44.1% | -0.4% |
| compiled raw stop node | 3,089 | 2,002 | -35.3% | -35.0%, -34.5%, -35.7% | +0.4% |
| DTD entity document | 5,451 | 3,381 | -38.2% | -36.5%, -38.4%, -40.1% | +0.6% |
| validate initiation XML | 3,097 | 2,685 | -12.8% | -12.8%, -1.2%, -14.0% | -0.1% |
| reject mismatched closing tag | 589 | 577 | -1.9% | -2.2%, -2.2%, -1.2% | +0.3% |

## Bun

| Case | Upstream ns | VPM ns | Time change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| construct default parser | 1,004 | 21 | -97.9% | -97.7%, -97.9%, -98.1% | -0.1% |
| construct configured parser | 1,062 | 376 | -64.5% | -62.6%, -62.9%, -65.8% | +0.9% |
| Storage fresh initiation string | 8,845 | 6,139 | -26.7% | -30.9%, -23.9%, -26.6% | +3.0% |
| Storage fresh initiation Buffer | 8,730 | 6,341 | -27.8% | -29.9%, -27.8%, -23.4% | +1.9% |
| reused initiation parser | 6,939 | 4,843 | -29.9% | -30.1%, -29.7%, -31.2% | -0.5% |
| 128 listed parts | 744,416 | 617,976 | -18.0% | -7.3%, -19.7%, -21.5% | +7.8% |
| attributes and numbers | 4,824 | 3,508 | -25.9% | -25.8%, -28.4%, -25.0% | +0.5% |
| 8 KiB text with entities | 89,647 | 3,796 | -95.7% | -95.6%, -96.0%, -95.7% | -0.0% |
| ordered mixed text | 2,768 | 1,366 | -50.4% | -50.1%, -50.2%, -50.7% | -1.5% |
| compiled raw stop node | 2,470 | 1,463 | -40.3% | -41.8%, -38.6%, -39.9% | +1.7% |
| DTD entity document | 4,059 | 2,168 | -46.5% | -55.0%, -43.0%, -44.1% | +0.3% |
| validate initiation XML | 3,222 | 1,933 | -41.3% | -40.8%, -39.1%, -43.6% | -1.4% |
| reject mismatched closing tag | 710 | 587 | -17.2% | -21.8%, -18.8%, -14.9% | +1.5% |

## Interpretation

Fresh Storage-shaped string and Buffer parses take about **32% less time on Node**
and **27–28% less on Bun**. Reusing the parser saves about 30% on both runtimes.
Large contiguous text gains come from slicing runs instead of concatenating each
character. Configuration snapshots share immutable defaults; explicit options
retain their copying and validation checks without a construction regression.

All 13 aggregate cases favor VPM in this sample. Node's mismatched-closing-tag
case is only 1.9% faster and should be treated as roughly unchanged. Bun's 128-part
case varies from 7.3% to 21.5% faster across processes, with a 7.8% identical-upstream
control skew; the exact gain is uncertain. Node validation also varies substantially
(1.2–14.0%). These are retained measurements, not universal speed guarantees.

These runs use warmed modules and fresh/reused instances as named; they do not
measure cold import time. Stricter behavior is tested separately where upstream's
output differs. Microbenchmarks do not measure complete uploads, cloud latency,
application adoption or deployed performance.

## Reproduce

```sh
OUTPUT=packages/vfast-xml-parser/bench/results/node-1.json node packages/vfast-xml-parser/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vfast-xml-parser/bench/results/node-control.json node packages/vfast-xml-parser/bench/compare.cjs
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vfast-xml-parser'))" -- --verify-current
```

Repeat fresh runs 2 and 3, then substitute Bun and its output filenames. Do not run
unrelated test suites concurrently with measurement. Source hashes cover this
implementation, all seven external VPM packages, the fixture snapshot and harness.
