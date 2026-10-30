# vis-unsafe measurements

Recorded October 30, 2026 on Apple M1 Pro, macOS arm64. Node 24.22.1 and
Bun 1.4.0; compared with is-unsafe 2.0.2. Refreshed after replacing dynamic context
imports with literal imports for browser bundling; matching algorithms are unchanged.

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
| HTML/XML plain entity | 426 | 113 | -73.5% | -73.7%, -72.8%, -73.8% | -0.2% |
| HTML/XML script entity | 43 | 59 | +38.8% | +35.7%, +39.1%, +49.0% | -0.8% |
| HTML/XML XML comment | 425 | 125 | -71.2% | -71.3%, -70.2%, -71.4% | -0.1% |
| HTML/XML long plain text | 20,923 | 6,696 | -68.1% | -67.9%, -68.1%, -68.3% | -0.2% |
| HTML/XML first reason | 94 | 149 | +59.6% | +59.5%, +60.3%, +59.0% | -1.0% |
| HTML/XML all matches | 584 | 773 | +32.5% | +31.6%, +33.3%, +32.1% | +0.3% |
| custom nonstateful regex | 32 | 39 | +24.2% | +24.1%, +22.9%, +25.3% | +0.2% |

## Bun

| Case | Upstream ns | VPM ns | Time change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| HTML/XML plain entity | 464 | 153 | -67.2% | -67.2%, -67.2%, -66.7% | -0.3% |
| HTML/XML script entity | 34 | 42 | +23.5% | +11.1%, +25.7%, +24.9% | -2.2% |
| HTML/XML XML comment | 475 | 121 | -74.6% | -74.6%, -74.5%, -74.7% | -0.5% |
| HTML/XML long plain text | 30,921 | 25,843 | -16.3% | -16.2%, -16.3%, -16.3% | +0.1% |
| HTML/XML first reason | 35 | 123 | +250.1% | +252.9%, +251.9%, +249.2% | +2.6% |
| HTML/XML all matches | 545 | 754 | +38.7% | +37.8%, +39.1%, +38.7% | +0.6% |
| custom nonstateful regex | 45 | 24 | -46.6% | -59.8%, -44.7%, -32.3% | -2.9% |

## Interpretation

Combined HTML/XML scans substantially improve ordinary entity text and XML
comment detection. Long text improves more on Node than Bun. Early script
matches remain slower because upstream can stop at its first rule. Diagnostic
APIs also remain slower: VPM returns isolated built-in regex copies and validates
contexts, while upstream returns shared mutable regexes. The Bun first-reason
case is 35 → 123 ns (+250.1%). The parser uses the boolean predicate, not these
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
