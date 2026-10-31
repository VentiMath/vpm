# vgoogle-gax measurements

Recorded October 30, 2026 on Apple M1 Pro / macOS arm64, using
Node 24.22.1 and Bun 1.4.0. Compared with google-gax 6.14.0.

Three fresh processes per runtime, 12 alternating paired rounds per case, 150 ms
warmup per variant plus four full warmup blocks. Iterations use a 15 ms upstream
pilot target capped at 100,000. Outputs are retained and validated outside timing.
An additional process compares identical upstream implementations. No trimming;
no other test suites ran during these measurements.

Values below are pooled median nanoseconds per operation. Change percentages are
medians of paired sample ratios, so they need not equal the ratio of the displayed
medians. Negative means less time. The control column is identical-upstream drift.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Per-process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| path / construct | 1,571 | 1,727 | +10.0% | +10.4%, +9.7%, +8.4% | +0.2% |
| path / construct and render | 2,399 | 2,312 | -3.6% | -2.0%, -3.7%, -4.2% | -0.8% |
| path / repeated render | 790 | 425 | -46.3% | -45.2%, -46.6%, -47.1% | +0.2% |
| path / repeated match | 1,130 | 247 | -78.0% | -77.9%, -77.8%, -78.9% | +0.1% |
| path / compound match | 959 | 197 | -79.7% | -80.6%, -78.9%, -80.1% | +0.0% |
| deadline / snapshot call options | 103 | 100 | -3.3% | -2.2%, -7.2%, -2.0% | -0.2% |
| REST parser / one small message | 2,005 | 1,726 | -13.9% | -13.9%, -7.6%, -20.5% | +5.1% |
| REST parser / 32 messages | 32,727 | 27,039 | -17.3% | -15.1%, -18.5%, -19.3% | -4.0% |
| REST parser / fragmented 64KiB message | 1,119,669 | 293,368 | -71.4% | -70.9%, -70.1%, -74.5% | -6.2% |
| Firestore SDK / unary document | 219,214 | 220,688 | +0.8% | +0.8%, +2.5%, -0.5% | -5.7% |
| Firestore SDK / batch read stream | 228,646 | 224,765 | -0.3% | -0.3%, +1.7%, -1.0% | +0.7% |

## Bun 1.4.0

| Case | Upstream ns | VPM ns | Paired change | Per-process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| path / construct | 2,003 | 1,689 | -14.2% | -4.3%, -21.7%, -16.8% | -2.0% |
| path / construct and render | 2,838 | 2,162 | -24.4% | -24.4%, -16.4%, -28.5% | +1.9% |
| path / repeated render | 699 | 283 | -62.4% | -63.0%, -62.9%, -56.9% | +0.3% |
| path / repeated match | 1,040 | 140 | -86.6% | -86.6%, -86.3%, -86.7% | -1.1% |
| path / compound match | 923 | 127 | -85.9% | -85.0%, -86.7%, -85.9% | +0.5% |
| deadline / snapshot call options | 68 | 60 | -11.1% | -10.9%, -11.4%, -11.1% | +1.9% |
| REST parser / one small message | 1,893 | 1,651 | -14.1% | -20.1%, -11.0%, -11.8% | -9.1% |
| REST parser / 32 messages | 21,440 | 16,594 | -23.5% | -23.2%, -23.0%, -24.8% | +0.7% |
| REST parser / fragmented 64KiB message | 797,470 | 194,790 | -75.5% | -75.0%, -75.5%, -75.8% | +1.8% |
| Firestore SDK / unary document | 120,535 | 125,726 | +5.9% | +5.6%, +3.8%, +7.3% | -5.9% |
| Firestore SDK / batch read stream | 146,727 | 146,056 | -0.3% | +0.4%, +2.8%, -3.7% | +10.5% |

## Interpretation and limits

Repeated rendering/matching improves substantially on both runtimes. Bare
construction on Node is **10% slower** (1.57 → 1.73 µs) because it builds reusable
structures; construction plus first render is 3.6% faster. On Bun those cases
improve 14% and 24%. The large fragmented JSON case improves **71% on Node and
75% on Bun**; the parser also performs the framing/validation checks described
in the package README. Small-message gains have more run-to-run noise.

The actual Firestore 9.4.0 SDK benchmarks send unary and batch-read RPCs to local
gRPC servers using the full selected gax/dependency stack. Node unary and both
batch-stream results are effectively level. Bun unary measured **5.9% slower**
(about 5 µs); the identical-upstream control drifted −5.9%, so this small result
needs more evidence before attributing it to the implementation. This is not a
claim of faster production Firestore requests, whose network and service latency
are absent from these local measurements.

The raw reports contain every sample, runtime, CPU and source hash. Hashes cover
the benchmark, pinned fixture locks, selected gax builds and reachable VPM runtime
modules. Earlier exploratory runs are not included in these final measurements.

```sh
for runtime in node bun; do
  for sample in 1 2 3; do
    OUTPUT="packages/vgoogle-gax/bench/results/$runtime-$sample.json" "$runtime" packages/vgoogle-gax/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT="packages/vgoogle-gax/bench/results/$runtime-control.json" "$runtime" packages/vgoogle-gax/bench/compare.cjs
done
node packages/vgoogle-gax/bench/summarize.cjs --verify-current
```
