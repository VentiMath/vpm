# Path-scurry measurements

Against path-scurry 3.0.0 on Node 24.22.1 and Bun 1.4.4. Each implementation
runs in a fresh process, with four balanced AB/BA pairs and identical-source
controls. Filesystem fixture creation and result validation are outside timing.
Cold walks include path-object construction and filesystem reads; warm walks
reuse cached observations. These are library workloads, not VentiMath builds.

| Workload | Node paired time change | Bun paired time change |
| --- | ---: | ---: |
| cold resolve 200 paths | -7.0% | +50.9% |
| warm resolve 1000 paths | +4.8% | -13.7% |
| cold filesystem walk 105 entries | -4.3% | -22.5% |
| cached directory read 1000 | -14.1% | -5.7% |
| warm walk 105 entries | +23.9% | +38.8% |
| warm async stream 105 entries | -0.6% | +0.3% |

Every final direction is **unestablished at this precision**: either process
pairs disagree or the spread in identical-source controls overlaps the result.
In particular, the cold Bun resolution and warm-walk medians still warrant
follow-up. Do not read the negative numbers as established speedups. Node's warm
walk medians are 1,058 ns upstream and 1,312 ns VPM per 105 entries; Bun's cold
resolution medians are 126,854 ns and 197,142 ns per 200 paths.

An initial pass identified avoidable per-node property-definition overhead,
duplicate cache reads and an async-generator promise for each streamed entry.
The final implementation uses native private fields, a direct synchronous walk,
one cached directory lookup and a demand-driven stream pump. Filesystem awaits,
cycle checks, filters and backpressure remain. All contracts were rerun after
this change, including destruction during an outstanding filesystem read.

[Node samples](node.json) and [Bun samples](bun.json) include source hashes,
calibration, process order and controls. [Initial Node samples](initial/node.json)
and [initial Bun samples](initial/bun.json) retain the development baseline;
their source hash predates the final implementation and they are not release
performance claims. No whole-build or general throughput gain is claimed.

```sh
OUTPUT=packages/vpath-scurry/bench/node.json node packages/vpath-scurry/bench/compare.cjs
OUTPUT=packages/vpath-scurry/bench/bun.json bun packages/vpath-scurry/bench/compare.cjs
```
