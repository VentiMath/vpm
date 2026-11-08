# Navigation widget measurements

The isolated harness compares full production-mode React server rendering of closed navigation,
ten suggestions and grouped suggestions. Four balanced AB/BA comparison pairs
and two identical-upstream control pairs run in fresh processes. All samples,
source hashes and runtime details remain in the JSON reports. The same React
19.1.0 renderer and synthetic data are used on each side.

These are rendering measurements, not a claim about whole-page latency or DOM
interaction speed. Real browser behavior is checked separately.

```sh
OUTPUT=packages/vreact-autosuggest/bench/results/node-isolated.json node packages/vreact-autosuggest/bench/compare.cjs
OUTPUT=packages/vreact-autosuggest/bench/results/bun-isolated.json bun packages/vreact-autosuggest/bench/compare.cjs
```

Measured on Node **24.22.1** and Bun **1.4.4**; times below are nanoseconds
per full server render (lower is better).

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| Closed navigation widget | 10,624 → 3,683 (65.2% lower) | 7,375 → 3,299 (55.4% lower) |
| Ten suggestions | 69,580 → 19,730 (71.2% lower) | 40,704 → 21,114 (47.7% lower) |
| Two sections, ten suggestions | 75,886 → 23,576 (68.4% lower) | 44,977 → 24,460 (45.2% lower) |

The measurements were refreshed for the r2 incremental-highlight repair. All
six results are lower in every comparison pair and exceed their identical-source
control spread. Maximum control spread is 4.6% on Node and 4.4% on Bun. No samples
were discarded. These numbers do not estimate end-user search latency; the app
also pays for MUI, filtering, layout and routing. The interaction repair is
verified by the separate browser regression, not by this server-render benchmark.

Reports: [Node](node-isolated.json), [Bun](bun-isolated.json).
