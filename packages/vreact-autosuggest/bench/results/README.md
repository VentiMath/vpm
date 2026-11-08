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
| Closed navigation widget | 11,765 → 3,985 (66.0% lower) | 7,873 → 3,602 (54.3% lower) |
| Ten suggestions | 79,832 → 22,139 (71.7% lower) | 43,180 → 22,071 (49.5% lower) |
| Two sections, ten suggestions | 86,378 → 28,463 (67.7% lower) | 47,627 → 25,930 (45.7% lower) |

All six results were lower in every comparison pair and exceeded their
identical-source control spread. The Node closed-widget control varied by up to
14.9%; that noise is retained in the report and is smaller than the measured
improvement. No samples were discarded. These numbers do not estimate end-user
search latency; the app also pays for MUI, filtering, layout and routing.

Reports: [Node](node-isolated.json), [Bun](bun-isolated.json).
