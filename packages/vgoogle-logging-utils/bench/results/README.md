# Logging benchmark evidence

Compared with google-logging-utils 0.0.2 on Node 24 and Bun. Each runtime has three
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
| Disabled lookup | 249 → 254 | +2.4% | 24 → 1 | −94.4% |
| Disabled invocation | 62 → 9 | −84.9% | 58 → 1 | −98.0% |
| Cached lookup | 220 → 232 | +5.7% | 30 → 6 | −79.2% |
| Custom backend dispatch | 93 → 75 | −19.1% | 78 → 38 | −60.5% |
| Event tap | 82 → 89 | +8.7% | 76 → 32 | −60.7% |
| Filtered Node output | 15 → 18 | +26.9% | 21 → 16 | −16.8% |
| Formatted Node output | 348 → 115 | −66.8% | 381 → 292 | −24.2% |
| Structured custom backend | 239 → 239 | −0.2% | 406 → 382 | −5.0% |

Node's remaining costs are small in absolute terms: roughly 12 ns for a cached
lookup, 7 ns for an isolated event tap and 3 ns for a filtered backend call.
The disabled-lookup difference crosses zero between processes. Node controls
range from −0.9% to +0.7%; Bun controls range from −1.0% to +2.5%. Bun's extremely
small disabled/lookup figures reflect JIT optimization of these repeated,
side-effect-free workloads; they are not an application-level speedup claim.
Its lookup and filtered-output results vary substantially between processes.
Formatted-output improvements are consistent across all processes on both runtimes.
