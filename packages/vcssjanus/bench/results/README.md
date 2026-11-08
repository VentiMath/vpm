# CSSJanus measurements

Measured on Node 24.22.1 and Bun 1.4.4 against cssjanus 2.3.1. Each case runs in fresh processes, with four balanced AB/BA pairs, two identical-upstream control pairs, 12 measured rounds, 150 ms warmup and 10 ms blocks. No results cache is used by the implementation. All raw samples, source hashes, order splits and controls are retained in the JSON files beside this document.

| Case | Node upstream → VPM (µs) | Bun upstream → VPM (µs) |
| --- | ---: | ---: |
| short directional declaration | 2.84 → 1.34 | 1.79 → 1.33 |
| unchanged rule | 2.31 → 1.16 | 1.11 → 1.14 |
| theme component | 12.03 → 16.23 | 18.78 → 20.26 |
| large stylesheet | 57.29 → 139.81 | 61.72 → 160.91 |
| varied stylesheet | 55.42 → 126.48 | 61.34 → 159.68 |
| unchanged RTL wrapper + app layer | 71.04 → 54.73 | 83.06 → 80.82 |

The short declaration is faster in every pair beyond control spread (52.7% less time on Node, 25.8% on Bun). The unchanged rule is 49.9% lower on Node; Bun's direction is unestablished. The **unchanged stylis-plugin-rtl + application layer pipeline** takes **22.6% less time on Node**. Its Bun difference is **unestablished**, including one reversed pair.

There are real regressions: the complete component is 35.4% slower on Node; its Bun direction is unestablished. Whole stylesheets are 2.27–2.42× the upstream time on Node and 2.58–2.65× on Bun by paired measurements, including a varied-declaration control. The source-aware converter does more work per declaration than upstream's whole-string replacements. Initial scanning was optimized before these final measurements, retaining every correctness test; remaining whole-sheet cost is not concealed by caching. The app middleware transforms individual rules rather than passing the whole stylesheet through CSSJanus once.

The caller fixture uses the unchanged installed wrapper and the app's middleware order, with synthetic CSS. These are conversion timings, not page-render, theme-toggle or application-latency measurements. Input/output parity is asserted for every timed case. Separate correctness tests cover intentional changes. Percentage figures use paired medians and need not equal the ratio of aggregate medians above. The largest identical-source control spread was 3.5% on Node and 9.8% on Bun; no directional claim is made where a comparison did not clear its case's control spread.

```sh
OUTPUT=packages/vcssjanus/bench/results/node-isolated.json node packages/vcssjanus/bench/compare.cjs
OUTPUT=packages/vcssjanus/bench/results/bun-isolated.json bun packages/vcssjanus/bench/compare.cjs
```
