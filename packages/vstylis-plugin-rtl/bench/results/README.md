# RTL middleware measurements

Node 24.22.1 and Bun 1.4.4; upstream stylis-plugin-rtl 2.1.1 with cssjanus 2.3.1. Both implementations use the same Stylis 4.3.6 parser and output pipeline. Each operation compiles a fresh AST; there is no reuse of transformed trees across timed operations.

The isolated harness runs four balanced AB/BA comparison pairs and two identical-upstream control pairs, with 12 rounds, 150 ms warmup and 10 ms blocks. Raw timings, hashes, order splits and controls are retained beside this document.

| Case | Node upstream → VPM (µs) | Bun upstream → VPM (µs) |
| --- | ---: | ---: |
| short rule | 4.88 → 3.12 | 3.87 → 2.57 |
| unchanged rule | 4.21 → 2.81 | 3.31 → 2.45 |
| nested component | 11.17 → 4.71 | 7.75 → 4.14 |
| actual app layer pipeline | 15.70 → 12.84 | 14.70 → 12.16 |
| varied stylesheet | 184.19 → 144.15 | 206.32 → 158.21 |

The **actual app layer pipeline** takes **19.1% less time on Node and 17.6% less on Bun**, with every comparison pair beyond its control spread. Nested components take 57.4%/47.1% less time. Eliminating the serialize/reparse round trip saves work while preserving the original nodes.

Node's short-rule and varied-sheet directions are **unestablished**: each has a comparison pair that reverses direction, despite lower aggregate medians. The other three Node cases and all five Bun cases are faster in every pair beyond their control spreads. Maximum identical-source spread is 3.9% on Node and 7.5% on Bun. No directional claim is made for the two unsettled Node cases, and no runtime regression is established by these samples.

Every timed case asserts exact output parity. The known nested-layer correction and noflip improvements are separate correctness cases, so the benchmark does not compare different outputs. The app case reproduces RootThemeProvider's real middleware order using synthetic CSS; these are conversion measurements, not application-render or theme-toggle latency. Paired percentage changes need not equal ratios of aggregate medians.

```sh
OUTPUT=packages/vstylis-plugin-rtl/bench/results/node-isolated.json node packages/vstylis-plugin-rtl/bench/compare.cjs
OUTPUT=packages/vstylis-plugin-rtl/bench/results/bun-isolated.json bun packages/vstylis-plugin-rtl/bench/compare.cjs
```
