# vxml-naming measurements

Recorded October 30, 2026 on Apple M1 Pro, macOS arm64. Node 24.22.1 and
Bun 1.4.0; compared with xml-naming 0.3.0.

Three fresh processes per runtime, each with 12 alternating paired rounds after
150 ms warmup per variant and four full warmup blocks. A 15 ms upstream pilot
sets iterations, capped at 100,000. Outputs are retained and checked outside
timing. A fourth process compares upstream against itself. No samples are
trimmed. Percentages are medians of paired ratios; time columns are pooled
medians and need not reproduce the percentage after rounding. Positive changes
mean more time; small differences near control noise are inconclusive.

## Node

| Case | Upstream ns | VPM ns | Time change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| direct ASCII QName | 36 | 35 | -1.4% | -1.0%, -2.4%, -1.4% | +1.0% |
| direct BMP QName | 59 | 63 | +7.2% | +6.0%, +7.3%, +8.6% | +0.4% |
| factory plus first check | 84 | 84 | +1.2% | +1.2%, +1.7%, +1.2% | +0.6% |
| cached QName vocabulary | 19 | 20 | +3.2% | +2.2%, +4.0%, +3.2% | -0.1% |
| unique QName after cache cap | 109 | 109 | +1.0% | +0.3%, +1.0%, +1.5% | +0.1% |
| diagnostic invalid local start | 89 | 54 | -38.7% | -38.6%, -39.1%, -38.5% | -0.1% |
| sanitize valid ASCII name | 70 | 44 | -36.1% | -36.3%, -35.9%, -36.1% | -0.2% |
| sanitize invalid ASCII name | 118 | 130 | +9.9% | +10.2%, +9.2%, +10.1% | -0.2% |

## Bun

| Case | Upstream ns | VPM ns | Time change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| direct ASCII QName | 34 | 29 | -4.6% | -4.6%, -1.9%, -9.9% | -2.2% |
| direct BMP QName | 24 | 28 | +12.7% | +12.8%, +13.2%, +12.2% | +0.2% |
| factory plus first check | 76 | 67 | -10.0% | -20.1%, -15.1%, -5.7% | +4.8% |
| cached QName vocabulary | 11 | 11 | +2.0% | +2.0%, +2.1%, +1.9% | -4.6% |
| unique QName after cache cap | 96 | 98 | +0.7% | +1.9%, +0.3%, +1.4% | +2.3% |
| diagnostic invalid local start | 49 | 35 | -27.3% | -2.8%, -28.0%, -32.0% | +1.7% |
| sanitize valid ASCII name | 52 | 28 | -46.1% | -45.2%, -45.8%, -46.3% | +1.9% |
| sanitize invalid ASCII name | 102 | 139 | +38.9% | +21.8%, +42.7%, +41.1% | +0.9% |

## Interpretation

The ordinary ASCII predicate and cache costs are small; do not interpret tiny
changes as application gains. BMP Unicode QName checks cost more with the
correct supplementary-capable grammar. Invalid-start diagnostics and valid QName
sanitization improve. Invalid-name repair remains slower, especially on Bun:
102 → 139 ns, with extra Unicode grammar and valid-output handling. The repair
case uses `name`, while the valid case uses `qName`; they exercise different
production paths. The diagnostic input is `1bad`, an invalid initial character.
The builder calls `createValidator` and its cached predicate, not `sanitize`.

## Reproduce

Install the pinned [fixture](../../../../scripts/xml-helpers-conformance), then:

```sh
OUTPUT=packages/vxml-naming/bench/results/node-1.json node packages/vxml-naming/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vxml-naming/bench/results/node-control.json node packages/vxml-naming/bench/compare.cjs
node packages/vxml-naming/bench/summarize.cjs --verify-current
```

Repeat fresh runs 2 and 3 and substitute `bun` for the Bun runs and filenames.
The JSON files retain all samples, checksums, runtime details and source hashes.
The summary verifies hashes against current implementation and harness files.
Utility microbenchmarks do not measure complete XML parsing, production traffic,
application adoption, startup, bundle size or memory use.
