# XML builder benchmarks

Compared with fast-xml-builder 1.3.1 on Apple M1 Pro / macOS arm64,
October 30, 2026: Node 24.22.1 and Bun 1.4.0. Three fresh processes and one
identical-upstream calibration per runtime. Each process runs 12 alternating
paired rounds after 150 ms warmup per variant and four full warmup blocks;
iterations target 15 ms from an upstream pilot, capped at 100,000 operations.
Outputs are retained and checked outside timing. No samples are discarded.

Times below are pooled median nanoseconds per operation. Changes are pooled
medians of **paired round ratios**, which need not equal a ratio of the displayed
medians. Process columns list each process's median paired change. Positive
changes are regressions. Controls run upstream against itself, not VPM.

## Node

| Case | Upstream → VPM ns | Paired change | Three process changes | Upstream control |
| --- | ---: | ---: | --- | ---: |
| construct default builder | 816 → 336 | -58.8% | -59.1%, -59.0%, -58.4% | +0.3% |
| construct Storage builder | 837 → 500 | -40.6% | -39.9%, -41.7%, -40.4% | +0.2% |
| Storage completion 4 parts | 3,724 → 2,034 | -47.6% | -47.7%, -26.7%, -47.7% | +0.7% |
| Storage completion 128 parts | 113,246 → 57,145 | -48.4% | -49.4%, -50.8%, -45.3% | +0.2% |
| short plain object | 906 → 448 | -51.8% | -50.7%, -51.8%, -52.3% | -0.4% |
| sparse 8 KiB text | 2,039 → 638 | -68.9% | -69.2%, -68.5%, -69.0% | -0.2% |
| dense escaped text | 9,970 → 3,295 | -66.7% | -66.9%, -65.7%, -65.3% | -0.2% |
| ordered attributes and text | 1,738 → 827 | -52.9% | -53.0%, -52.1%, -53.4% | +0.2% |
| compiled raw stop node | 701 → 777 | +10.5% | +8.6%, +11.2%, +10.8% | +0.4% |
| formatted nested object | 1,853 → 855 | -54.1% | -55.1%, -53.9%, -53.2% | -0.8% |

## Bun

| Case | Upstream → VPM ns | Paired change | Three process changes | Upstream control |
| --- | ---: | ---: | --- | ---: |
| construct default builder | 341 → 123 | -64.6% | -65.2%, -64.3%, -65.3% | +0.9% |
| construct Storage builder | 303 → 189 | -38.0% | -38.4%, -37.2%, -38.4% | -0.7% |
| Storage completion 4 parts | 2,947 → 1,830 | -38.5% | -38.2%, -39.1%, -38.7% | -1.0% |
| Storage completion 128 parts | 104,483 → 62,253 | -41.0% | -42.1%, -39.8%, -40.1% | +1.5% |
| short plain object | 871 → 516 | -41.3% | -43.9%, -37.5%, -40.9% | +0.4% |
| sparse 8 KiB text | 2,691 → 547 | -79.7% | -79.9%, -78.5%, -80.0% | -1.5% |
| dense escaped text | 11,333 → 4,178 | -63.1% | -63.3%, -63.1%, -62.8% | +1.5% |
| ordered attributes and text | 1,212 → 686 | -42.4% | -42.0%, -41.5%, -43.6% | +1.5% |
| compiled raw stop node | 606 → 631 | +6.0% | +11.1%, +1.2%, +4.2% | +0.2% |
| formatted nested object | 1,558 → 786 | -49.9% | -39.6%, -49.4%, -51.3% | +1.7% |

## Interpretation and limits

Storage completion-body generation improves **about 48% on Node and 39–41% on
Bun** for four- and 128-part arrays with quoted ETags. These inputs use Storage's
actual `arrayNodeName: 'Part'` option and completion-body structure. They measure
serialization of the parts, not transport, hashing or complete upload latency.

Default construction improves 59% on Node and 65% on Bun; Storage-shaped
construction improves 41% and 38%. Default and root-array-only configurations
reuse validated immutable data and shared methods. Configurations containing
callbacks, custom rules or other options still use the general validation path.
Cold module imports are outside these measurements.

Default XML escaping uses an inline scan, preserving all five replacements and
negative-zero conversion. The dense-text case improves 67% on Node and 63% on Bun;
sparse 8 KiB text improves 69% and 80%. Ordinary serialization avoids path tracking
when no option needs it and avoids constructing an unused name validator.

The remaining regression is the compiled raw stop-node case: **701 → 777 ns on
Node** (+10.5%) and **606 → 631 ns on Bun** (+6.0%). It exercises path tracking and
raw traversal, which now include cycle/depth guards and own-only text handling.
The measurements do not isolate each guard's cost. Bun's process medians range
from +1.2% to +11.1%, against a +0.2% identical-upstream control. This small
absolute cost is documented; the exercised Storage path does not use stop nodes.

The four-part Node case also varies: two processes improve about 48%, one about
27%. The table retains that spread; no process or sample was discarded.

Raw samples retain implementation, VPM dependency and harness hashes. These
microbenchmarks do not establish an end-to-end application speedup or imply that
the application has adopted the replacement.

## Reproduce

From the repository root after installing the conformance fixture:

```sh
for runtime in node bun; do
  for run in 1 2 3; do
    OUTPUT="packages/vfast-xml-builder/bench/results/$runtime-$run.json" "$runtime" packages/vfast-xml-builder/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT="packages/vfast-xml-builder/bench/results/$runtime-control.json" "$runtime" packages/vfast-xml-builder/bench/compare.cjs
done
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vfast-xml-builder'))" -- --verify-current
```

Run sequentially without concurrent test loads. Source verification rejects
measurements from another implementation.
