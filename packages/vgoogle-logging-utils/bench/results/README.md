# Logging benchmark evidence

Compared with google-logging-utils 2.1.1 on Node 24 and Bun. Each runtime has three
fresh processes and one identical-upstream control, with 12 alternating paired
rounds per case. All samples and source hashes are retained. The console sink is
captured without terminal I/O; formatting is validated outside the timing loop.
Backend dispatch, event taps, disabled calls and logger lookup are separate cases.

```sh
for runtime in node bun; do
  for run in 1 2 3; do
    OUTPUT=packages/vgoogle-logging-utils/bench/results/$runtime-$run.json $runtime packages/vgoogle-logging-utils/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT=packages/vgoogle-logging-utils/bench/results/$runtime-control.json $runtime packages/vgoogle-logging-utils/bench/compare.cjs
done
node packages/vgoogle-logging-utils/bench/summarize.cjs --verify-current
```

Recorded 2026-10-29 on Apple M1 Pro/macOS arm64, Node 24.22.1 and Bun 1.4.0.
Negative changes mean less time; percentages are medians of paired ratios.

| Case | Node upstream → VPM (ns) | Change | Bun upstream → VPM (ns) | Change |
| --- | ---: | ---: | ---: | ---: |
| Disabled lookup | 257 → 255 | -0.5% | 24 → 2 | -92.3% |
| Disabled invocation | 61 → 9 | -84.9% | 58 → 1 | -98.0% |
| Cached lookup | 47 → 32 | -32.8% | 23 → 5 | -78.9% |
| Manual backend lookup, no flag | 47 → 32 | -32.2% | 27 → 7 | -74.5% |
| Custom backend dispatch | 92 → 74 | -19.3% | 88 → 29 | -66.6% |
| Event tap | 82 → 88 | +7.0% | 80 → 33 | -54.6% |
| Filtered Node output | 14 → 18 | +24.2% | 20 → 16 | -12.7% |
| Formatted Node output | 341 → 114 | -66.0% | 376 → 303 | -19.2% |
| Structured default stdout | 247 → 243 | -1.4% | 400 → 379 | -5.4% |
| Structured custom backend | 244 → 238 | -2.7% | 420 → 390 | -7.1% |

Remaining Node costs are approximately 6 ns per event tap and 4 ns per filtered
call. Filtered-call overhead varies from +1% to +28% across processes. Formatted
output improves in every process on both runtimes. Structured output improves
slightly despite retaining namespace filtering and protected message/severity fields.

The identical-upstream Node cached-lookup control differs by +11.9% (about 4 ns),
so its measured 33% improvement is directional rather than a precise estimate.
Other Node controls range from −2.1% to +0.3%; Bun controls range from −2.8% to +2.0%.
Bun's tiny lookup/disabled-call figures reflect JIT optimization of repeated calls;
lookup and dispatch magnitudes vary between processes. These microbenchmarks do
not establish an application-level speedup or measure actual console I/O.
