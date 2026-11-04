# Native React rendering: r6 versus r7

r7 renders SVG and MathML as React elements, sharing the same parser and layout
rules as the string API. r6 used cached HTML insertion. The unchanged-update
baseline already includes r6's DOM-preservation fix; these measurements do not
compare against the earlier focus/scroll bug.

In production Chrome, changed-formula updates take **62.3% less time** and
unchanged 20-formula updates take **33.8% less time**, with every comparison pair
beyond the identical-baseline control spread. First mounts have higher median
times, but their direction is not established by these controls. This is not a
claim that every operation or the consuming application is faster.

There is a remaining cost in the shared layout abstraction: **uncached string
output is slower** than r6. The Node fraction and array cases increase by 34.4%
and 45.2% (roughly 8.5 and 12.6 microseconds); the Bun array increases by 26.3%
(roughly 9.1 microseconds). Cached string timings have no established change.
Native React does not call this string emitter. The result preserves one set of
layout rules and strict escaping, but does not eliminate this performance debt.

## Method

All comparisons use the immutable `vlx-0.1.0-r6` archive, SHA-256
`e45ae2f9727672d9635e08a125b617af05fa716ee1c768d6b5edc221cbdff275`.
Baseline file hashes were checked against its release manifest. Candidate
runtime, fixture and runner hashes are recorded with the raw samples. The
candidate archive hash identifies the temporary benchmark pack; the published
pack also contains final documentation and rewritten dependency URLs.

Four comparison pairs alternate baseline-first and candidate-first order. Two
additional pairs run identical r6 code as controls. Every implementation uses a
fresh process, with at least 150 ms warmup and 12 retained samples per case.
Nothing is trimmed. The percentage is the median of four pairwise changes;
timing columns are medians of process medians, so their ratio can differ.

A direction is established here only when every pair has the same direction
and exceeds the largest absolute control difference, with a 2% minimum floor.
This conservative descriptive rule is not a confidence interval. Noise, GC and
order sensitivity remain visible in the raw records. Negative percentages mean
less time. All numbers are local synthetic workloads, not app latency claims.

The Chrome run uses React 19.1.0 in production mode, with modules preloaded and
identical fixed iteration counts. It measures synchronous React/DOM work plus
forced layout; it excludes loading, network and paint. Node/Bun React runs use
React 19.1.0's development build and jsdom 27.4.0, which measure test-environment
costs rather than browser rendering. The string runner has no jsdom history and
uses the isolated, calibrated process harness. The runners are sequential.

## Production Chrome

Recorded 2026-11-04T08:55:17.207Z. [Raw measurements and source hashes](react-r7-chrome.json).

| Case | r6 µs | r7 µs | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| first mount / cached formula | 116.250 | 125.000 | +7.7% | 6.2% | unestablished at this precision |
| first mount / uncached formula | 165.000 | 183.750 | +12.3% | 7.9% | unestablished at this precision |
| first mount / 20-formula paper | 2212.500 | 2425.000 | +10.9% | 1.1% | unestablished at this precision |
| first mount / 12x12 matrix | 3812.500 | 3950.000 | +4.7% | 4.7% | unestablished at this precision |
| unchanged single formula | 4.250 | 4.500 | +0% | 11.1% | unestablished at this precision |
| unchanged 20-formula paper | 27.875 | 18.375 | -33.8% | 2.7% | lower time in every pair, beyond control spread |
| changed formula | 106.250 | 40.000 | -62.3% | 7.1% | lower time in every pair, beyond control spread |

## React in Node 24 / jsdom

Recorded 2026-11-04T08:53:40.902Z. [Raw measurements and source hashes](react-r7-node.json).

| Case | r6 µs | r7 µs | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| first mount / cached formula | 1296.439 | 822.098 | -36.9% | 8.7% | lower time in every pair, beyond control spread |
| first mount / uncached formula | 1477.180 | 1288.774 | -15.2% | 8.9% | unestablished at this precision |
| first mount / 20-formula paper | 20866.479 | 15726.020 | -21.9% | 7.5% | lower time in every pair, beyond control spread |
| first mount / 12x12 matrix | 19589.031 | 14442.729 | -22.8% | 10.4% | lower time in every pair, beyond control spread |
| unchanged single formula | 23.784 | 21.471 | -9.1% | 3.3% | lower time in every pair, beyond control spread |
| unchanged 20-formula paper | 155.296 | 106.753 | -30.9% | 6.2% | lower time in every pair, beyond control spread |
| changed formula | 941.540 | 108.045 | -88.7% | 14.9% | lower time in every pair, beyond control spread |

## React in Bun / jsdom

Recorded 2026-11-04T08:54:48.514Z. [Raw measurements and source hashes](react-r7-bun.json).

| Case | r6 µs | r7 µs | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| first mount / cached formula | 945.639 | 560.446 | -43% | 11.6% | lower time in every pair, beyond control spread |
| first mount / uncached formula | 924.112 | 653.240 | -32.6% | 22.4% | unestablished at this precision |
| first mount / 20-formula paper | 15070.875 | 10813.615 | -28.1% | 8% | lower time in every pair, beyond control spread |
| first mount / 12x12 matrix | 13761.646 | 8483.635 | -34.5% | 16.4% | lower time in every pair, beyond control spread |
| unchanged single formula | 12.372 | 9.122 | -27.7% | 6% | unestablished at this precision |
| unchanged 20-formula paper | 50.406 | 33.073 | -34.4% | 16% | unestablished at this precision |
| changed formula | 637.087 | 63.767 | -89.9% | 8.2% | lower time in every pair, beyond control spread |

## String output in Node 24

Recorded 2026-11-04T08:52:35.392Z. [Raw measurements and source hashes](output-r7-node.json).

| Case | r6 µs | r7 µs | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| uncached fraction | 21.243 | 29.730 | +34.4% | 0.9% | higher time in every pair, beyond control spread |
| uncached ruled array | 27.971 | 40.597 | +45.2% | 4.7% | higher time in every pair, beyond control spread |
| cached fraction | 0.205 | 0.207 | +0.6% | 2.1% | unestablished at this precision |

## String output in Bun

Recorded 2026-11-04T08:53:52.821Z. [Raw measurements and source hashes](output-r7-bun.json).

| Case | r6 µs | r7 µs | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| uncached fraction | 28.425 | 33.745 | +15.3% | 14.3% | unestablished at this precision |
| uncached ruled array | 34.423 | 43.483 | +26.3% | 4.2% | higher time in every pair, beyond control spread |
| cached fraction | 0.120 | 0.119 | -0.4% | 0.9% | unestablished at this precision |

## Reproduce

Install the pinned conformance fixtures first. Download and verify the r6
release archive and manifest; extract the archive into a temporary directory.
Run from the repository root, substituting those local paths:

```sh
OUTPUT=react-node.json node scripts/vlx-conformance/bench-react.cjs /path/to/r6/vlx-0.1.0.tgz
OUTPUT=react-bun.json bun scripts/vlx-conformance/bench-react.cjs /path/to/r6/vlx-0.1.0.tgz
OUTPUT=react-chrome.json node scripts/vlx-conformance/bench-browser.cjs /path/to/r6/vlx-0.1.0.tgz
OUTPUT=output-node.json node scripts/vlx-conformance/bench-output.cjs /path/to/extracted/package
OUTPUT=output-bun.json bun scripts/vlx-conformance/bench-output.cjs /path/to/extracted/package
```

`CHROME_BIN` can select the Chrome executable. Benchmark fixture installs and
Chrome processes are temporary and removed when each runner finishes. Source
hashes and recording structure are verified before reporting. Historical
KaTeX/MathJax comparisons on the results index describe r5, not this r7 layout.
