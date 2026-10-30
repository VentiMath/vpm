# vhtml-entities paired benchmarks

Baseline: **html-entities 2.6.0**. Recorded October 30, 2026 on Apple M1 Pro,
darwin arm64, with Node.js 24.22.1 and Bun 1.4.0.
Times below are nanoseconds per operation; lower is better.

Each engine has three fresh-process reports and an identical-upstream control.
Cases receive at least 150ms of warmup per variant plus four warmup blocks, then
12 alternating paired rounds. A 15ms upstream pilot selects iterations, capped at
100,000. Inputs vary across 64 strings (four in single-entity cases); outputs are
retained and validated outside timing. No samples are discarded.

Times are medians of 36 samples. Changes are medians of paired ratios, not ratios
of the displayed medians. All three per-process changes are shown. Controls time
identical code in both slots and are reported without subtracting them. Several
cases show material process variation; small changes should be treated cautiously.

## Node

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| decode plain text | 125 | 21 | -83.4% | -83.6%, -83.5%, -82.9% | -0.3% |
| decode Storage HTML error | 1,125 | 1,042 | -7.3% | -5.8%, -8.5%, -7.7% | +0.1% |
| decode dense named 8KiB | 237,431 | 244,181 | -0.5% | -8.6%, -0.5%, +9.1% | -4.6% |
| decode mixed numeric 4KiB | 201,792 | 137,845 | -31.6% | -32.1%, -32.6%, -27.4% | +0.1% |
| decode attribute | 980 | 946 | -2.6% | -0.8%, -3.4%, -3.2% | +0.8% |
| decode strict XML | 1,258 | 1,066 | -8.0% | -6.7%, -11.8%, -14.6% | -4.5% |
| single named entity | 35 | 31 | -5.9% | -3.3%, -11.6%, -6.3% | +1.3% |
| single numeric entity | 125 | 56 | -54.9% | -55.2%, -53.7%, -54.3% | -0.7% |
| encode plain text | 109 | 38 | -64.2% | -63.1%, -68.6%, -64.4% | -0.6% |
| encode short special characters | 989 | 485 | -53.4% | -50.4%, -53.4%, -60.3% | +9.9% |
| encode Unicode nonAscii | 29,772 | 28,548 | -3.1% | -1.8%, -10.0%, -3.6% | -7.3% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| decode plain text | 42 | 25 | -38.6% | -59.8%, -38.1%, -38.0% | -2.8% |
| decode Storage HTML error | 636 | 537 | -17.0% | -17.6%, -12.9%, -19.5% | +2.6% |
| decode dense named 8KiB | 134,836 | 126,247 | -8.8% | +3.4%, -14.6%, -13.4% | +0.7% |
| decode mixed numeric 4KiB | 100,196 | 62,862 | -34.6% | -32.1%, -36.5%, -38.2% | -1.8% |
| decode attribute | 781 | 719 | -9.8% | +3.2%, -10.2%, -15.7% | +1.6% |
| decode strict XML | 852 | 674 | -20.2% | -13.5%, -20.8%, -17.9% | -2.0% |
| single named entity | 13 | 11 | -19.6% | -20.7%, -19.8%, -15.7% | +0.4% |
| single numeric entity | 50 | 43 | -12.3% | -14.0%, -15.8%, -3.9% | +1.0% |
| encode plain text | 41 | 23 | -43.8% | -41.3%, -45.5%, -45.7% | -0.6% |
| encode short special characters | 341 | 172 | -48.3% | -49.7%, -45.4%, -46.4% | -0.5% |
| encode Unicode nonAscii | 23,951 | 28,867 | +21.2% | +23.0%, +19.2%, +21.3% | +1.9% |

## Interpretation

Plain-text decoding takes about 83% / 39% less time on Node / Bun. Storage-shaped
HTML error decoding takes about 7% / 17% less, and mixed numeric decoding about
32% / 35% less. The single numeric parser validates and accumulates in one pass;
it takes about 55% / 12% less time here. Short special-character encoding takes
about 53% / 48% less. No cloud traffic or application throughput is measured.

Dense named decoding varies by process: Node ranges from improvement to regression,
and Bun's first process also regresses. The Node Unicode-encoding change is smaller
than its control variation, so it is not a demonstrated gain. Attribute decoding
also varies in direction across Bun processes.

**Bun Unicode `nonAscii` encoding is a repeatable regression: 23,951 → 28,867ns
(+21.2%, with process changes from +19.2% to +23.0%; control +1.9%).** This wider
encoding path retains the full upstream selection and naming behavior but costs
more in this engine. Storage calls `decode`; this encoding result remains relevant
for other consumers and is not hidden by the decoder improvements.

## Reproduce

```sh
npm --prefix scripts/entities-conformance ci --ignore-scripts
OUTPUT=/tmp/entities-node.json node packages/vhtml-entities/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/entities-control.json node packages/vhtml-entities/bench/compare.cjs
node packages/vhtml-entities/bench/summarize.cjs --verify-current
```

Repeat measurement with `bun`. The eight JSON reports retain raw samples,
iteration counts, runtime/CPU details, checksums and SHA-256 hashes of runtime,
benchmark and retained upstream sources. `--verify-current` confirms that the
working sources match those measurements.
