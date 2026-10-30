# vis-unsafe measurements

Recorded October 30, 2026 on Apple M1 Pro, macOS arm64. Node 24.22.1 and
Bun 1.4.0; compared with is-unsafe 2.0.2.

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
| HTML/XML plain entity | 429 | 112 | -74.0% | -74.2%, -73.8%, -74.0% | -0.1% |
| HTML/XML script entity | 42 | 58 | +37.7% | +37.7%, +36.4%, +39.1% | +0.9% |
| HTML/XML XML comment | 428 | 123 | -71.3% | -71.8%, -71.2%, -71.1% | +0.0% |
| HTML/XML long plain text | 21025 | 6684 | -68.2% | -68.3%, -68.1%, -68.2% | -0.1% |
| HTML/XML first reason | 94 | 150 | +58.2% | +57.8%, +56.5%, +59.8% | +0.0% |
| HTML/XML all matches | 586 | 769 | +30.8% | +29.3%, +30.3%, +34.4% | -0.5% |
| custom nonstateful regex | 31 | 39 | +25.5% | +24.3%, +24.3%, +63.6% | +0.1% |

## Bun

| Case | Upstream ns | VPM ns | Time change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| HTML/XML plain entity | 468 | 152 | -67.8% | -66.6%, -67.7%, -67.8% | -0.1% |
| HTML/XML script entity | 34 | 42 | +21.8% | +12.7%, +25.2%, +22.8% | +5.4% |
| HTML/XML XML comment | 478 | 122 | -74.6% | -74.2%, -74.5%, -74.7% | +0.3% |
| HTML/XML long plain text | 31019 | 25842 | -16.6% | -16.8%, -16.4%, -16.6% | -0.2% |
| HTML/XML first reason | 35 | 124 | +248.8% | +249.5%, +252.8%, +246.7% | +0.4% |
| HTML/XML all matches | 555 | 754 | +36.4% | +33.9%, +38.1%, +35.5% | -0.7% |
| custom nonstateful regex | 44 | 26 | -38.5% | -39.6%, -26.1%, -22.3% | +1.3% |

## Interpretation

Combined HTML/XML scans substantially improve ordinary entity text and XML
comment detection. Long text improves more on Node than Bun. Early script
matches remain slower because upstream can stop at its first rule. Diagnostic
APIs also remain slower: VPM returns isolated built-in regex copies and validates
contexts, while upstream returns shared mutable regexes. The Bun first-reason
case is 35 → 124 ns (+248.8%). The parser uses the boolean predicate, not these
diagnostic APIs. Custom nonstateful regex overhead regresses on Node and improves
on Bun. Stateful regex behavior is verified separately because upstream's
changing answers cannot be treated as a correct performance baseline.

## Reproduce

Install the pinned [fixture](../../../../scripts/xml-helpers-conformance), then:

```sh
OUTPUT=packages/vis-unsafe/bench/results/node-1.json node packages/vis-unsafe/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vis-unsafe/bench/results/node-control.json node packages/vis-unsafe/bench/compare.cjs
node packages/vis-unsafe/bench/summarize.cjs --verify-current
```

Repeat fresh runs 2 and 3 and substitute `bun` for the Bun runs and filenames.
The JSON files retain all samples, checksums, runtime details and source hashes.
The summary verifies hashes against current implementation and harness files.
Utility microbenchmarks do not measure complete XML parsing, production traffic,
application adoption, startup, bundle size or memory use.
