# vmime measurements

Baseline: **mime 4.1.2**. Measured October 30, 2026 on Apple M1 Pro,
darwin/arm64, using Node 24.22.1 and Bun 1.4.0.

## Method

Three fresh processes and one identical-upstream control per runtime. Each case
uses 150 ms warmup per implementation, four full warmup blocks and 12 alternating
paired rounds. An upstream pilot targets 15 ms, capped at 100,000 operations.
Outputs are retained and asserted outside timing; no samples are trimmed. Raw
JSON contains every sample, runtime/CPU metadata and SHA-256 hashes for runtime
source, tables, benchmark, retained fixture manifest and shared harness.

Times are pooled medians in nanoseconds per operation. Percentage changes are
medians of paired ratios, so they need not equal the ratio of rounded times.
The three process percentages and control effects are shown explicitly. Negative
means less time. No other repository test or benchmark job ran concurrently.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Identical control |
| --- | ---: | ---: | ---: | --- | ---: |
| bare extension | 94 | 22 | -76.8% | -76.5%, -76.4%, -78.2% | 0.1% |
| Storage object | 174 | 53 | -69.2% | -69.2%, -70.5%, -66.9% | 0.2% |
| Windows path | 166 | 54 | -67.5% | -67.5%, -71.4%, -65.4% | 0.0% |
| long object path | 710 | 58 | -91.8% | -91.8%, -92.9%, -91.2% | -0.4% |
| unknown extension | 240 | 108 | -54.8% | -52.8%, -54.8%, -56.3% | -0.4% |
| extensionless path | 97 | 17 | -82.1% | -82.0%, -82.2%, -81.9% | 0.3% |
| reverse plain | 75 | 40 | -46.9% | -46.8%, -46.6%, -47.5% | -0.0% |
| reverse parameters | 101 | 70 | -30.1% | -28.0%, -30.9%, -30.6% | -0.4% |
| all extensions copy | 112 | 90 | -19.7% | -18.5%, -20.3%, -20.1% | -0.0% |
| custom constructor | 1040 | 406 | -62.0% | -61.2%, -60.8%, -62.9% | -26.1% |
| custom redefine | 200 | 175 | -11.2% | -10.8%, -18.7%, -9.4% | -0.8% |
| full table construction | 365432 | 542906 | 50.2% | 50.7%, 44.1%, 52.1% | 4.5% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Identical control |
| --- | ---: | ---: | ---: | --- | ---: |
| bare extension | 59 | 10 | -82.5% | -82.8%, -79.0%, -83.6% | 0.2% |
| Storage object | 166 | 79 | -53.2% | -52.3%, -48.8%, -53.7% | 0.3% |
| Windows path | 162 | 87 | -45.6% | -46.6%, -46.0%, -45.1% | -0.8% |
| long object path | 701 | 97 | -86.1% | -86.1%, -85.9%, -86.1% | 0.2% |
| unknown extension | 143 | 86 | -39.8% | -38.3%, -39.8%, -43.0% | 0.1% |
| extensionless path | 98 | 16 | -83.2% | -82.2%, -86.6%, -82.8% | 0.3% |
| reverse plain | 45 | 34 | -23.5% | -23.1%, -25.4%, -23.1% | -1.7% |
| reverse parameters | 91 | 81 | -11.4% | -13.7%, -4.2%, -13.9% | 1.0% |
| all extensions copy | 94 | 101 | 10.8% | 12.4%, 19.8%, 5.0% | 0.2% |
| custom constructor | 657 | 496 | -27.3% | -28.5%, -27.6%, -26.1% | 3.7% |
| custom redefine | 159 | 193 | 7.9% | 27.2%, 4.3%, 28.5% | -3.6% |
| full table construction | 285942 | 590360 | 113.3% | 118.5%, 106.9%, 113.3% | -2.9% |

## Interpretation and limitations

The Storage-style object lookup takes **69% less time on Node and 53% less on
Bun**. Bare suffixes, Windows paths, unknown/extensionless inputs and long object
paths also improve. The long path contains 200 directory segments; its 92%/86%
reduction follows from avoiding work on those directories. These are warm local
CPU costs; Storage network latency and application throughput were not measured.

Regressions remain visible: copying all extensions takes about 7 ns more on Bun,
and its repeated custom redefinition case also costs more, with substantial
process variability. Reconstructing all tables takes about **0.54 ms versus
0.37 ms on Node**, and **0.59 ms versus 0.29 ms on Bun**. Atomic definition staging
adds work to that construction path. Storage uses the shared built-in instance;
it does not reconstruct the database for each lookup. This case times repeated
constructor calls with the same full tables, not cold module imports or total
startup, and both variants receive the same frozen input arrays.

The Node custom-constructor control itself differed by **26%** despite identical
implementations. Its apparent 62% improvement is therefore not a precise speedup
claim. Other Node controls were within 4.5%, and Bun controls within 3.7%. Results
below or near those effects warrant caution; all three processes and controls
are retained rather than selecting the best run.

The custom-redefinition case repeatedly defines the same small mapping. It does
not measure adding thousands of mappings or failed definitions. MIME lookup
uses identical current data in both variants; mime 3 migration is tested
separately and is not included in these performance comparisons.

## Reproduce

From the repository root, install the pinned comparison fixture first:

```sh
npm --prefix scripts/mime-conformance ci --ignore-scripts --no-audit --no-fund
OUTPUT=packages/vmime/bench/results/node-1.json node packages/vmime/bench/compare.cjs
OUTPUT=packages/vmime/bench/results/bun-1.json bun packages/vmime/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vmime/bench/results/node-control.json node packages/vmime/bench/compare.cjs
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vmime'))" -- --verify-current
```

Repeat each runtime for runs 1–3 and its control. The final command verifies all
eight reports and current source hashes, then prints the aggregate table.
