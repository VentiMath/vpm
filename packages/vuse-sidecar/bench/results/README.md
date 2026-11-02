# Sidecar measurements

Recorded November 2, 2026 on Node 24.22.1 and Bun 1.4.0 against use-sidecar 1.1.3,
with React 19.1.0 in production mode. Four fresh-process comparison pairs and two
identical-upstream control pairs alternate AB/BA order. Iteration counts match
within each pair; warmup and output validation are outside timing. Raw samples,
controls and final source hashes are retained without trimming. This limits
order/JIT contamination but does not remove desktop scheduling or GC noise.

Medium creation retains the created object. Churn keeps 64 distinct registrations
live while adding/removing one more. The async case delivers 64 values in a
microtask batch. The React case mounts once, then commits changing render-prop
values in jsdom. These are local CPU measurements, not browser frame rate.

| Runtime / case | Upstream ns | VPM ns | Median paired change | Largest control difference | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| [Bun: create sidecar medium](bun-0.json) | 52 | 85 | 61.6% | 7.9% | higher time in every pair, beyond control spread |
| [Bun: register and cancel with 64 live values](bun-1.json) | 381 | 12 | -97.2% | 2.4% | lower time in every pair, beyond control spread |
| [Bun: synchronous medium dispatch](bun-2.json) | 1 | 1 | 48.5% | 0.9% | higher time in every pair, beyond control spread |
| [Bun: asynchronous batch of 64 values](bun-3.json) | 5133 | 664 | -87.1% | 2.2% | lower time in every pair, beyond control spread |
| [Bun: mounted renderCar update](bun-4.json) | 5277 | 6118 | 14.9% | 0.6% | higher time in every pair, beyond control spread |
| [Node: create sidecar medium](node-0.json) | 66 | 84 | 33.1% | 37.4% | unestablished at this precision |
| [Node: register and cancel with 64 live values](node-1.json) | 175 | 18 | -90.1% | 472.8% | unestablished at this precision |
| [Node: synchronous medium dispatch](node-2.json) | 3 | 3 | 4.8% | 18.6% | unestablished at this precision |
| [Node: asynchronous batch of 64 values](node-3.json) | 2753 | 1107 | -59.7% | 47.5% | lower time in every pair, beyond control spread |
| [Node: mounted renderCar update](node-4.json) | 5744 | 6010 | 3.5% | 21.5% | unestablished at this precision |

Async batches take about 60% less time on Node and 87% less on Bun. Bun registration
churn takes about 97% less. Node churn is inconclusive despite lower comparison
medians: its identical-source control varied by 473%, and remains visible.

Costs remain on Bun: creation takes 52 → 85 ns, and `renderCar` updates take
5.28 → 6.12 µs (15% more). Synchronous dispatch also measures higher, but both
rounded medians are about 1 ns; the raw sub-nanosecond difference is not an
application-scale claim. The other Node cases are inconclusive. The verified
react-remove-scroll caller uses medium creation and export wrappers, not
`renderCar`; these tests do not establish faster scrolling.

Reproduce sequentially with `node packages/vuse-sidecar/bench/compare.cjs` and
`bun packages/vuse-sidecar/bench/compare.cjs`.
