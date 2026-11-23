# Minimatch measurements

Node 24.22.1 and Bun 1.4.4, macOS ARM64. Each variant runs in a separate fresh process; four alternating comparison pairs and two identical-upstream control pairs are retained. These are isolated operations, not end-to-end build times.

| Operation | Node upstream / VPM (ns) | Node change | Bun upstream / VPM (ns) | Bun change |
| --- | ---: | --- | ---: | --- |
| Distinct pattern construction and match | 3851 / 2356 | -39.2% | 5493 / 3258 | -41.2% |
| Repeated literal public call | 80 / 34 | -57.8% | 40 / 23 | -43.1% |
| Repeated build-glob public call | 143 / 236 | +64.9% | 92 / 183 | +100.5% |
| Reused build matcher | 363 / 223 | -38.6% | 210 / 186 | unestablished |
| Reused URL header matcher | 63 / 88 | unestablished | 24 / 51 | +110.8% |
| Negated extglob test exclusion | 155 / 207 | +34.2% | 160 / 152 | unestablished |
| Compact numeric range | 353 / 201 | -43.0% | 247 / 128 | -48.3% |

Distinct pattern construction and compact numeric ranges take less time on both runtimes. Repeated literal calls are also faster. The reused build matcher improves on Node; the Bun direction is unestablished.

Regressions remain in repeated public build-glob calls (Node 143 → 236 ns; Bun 92 → 183 ns), Node negated extglob checks (155 → 207 ns) and Bun URL-header matching (24 → 51 ns). Those tiny warm operations benefit more from upstream’s internal specialization. The implementation is not presented as universally faster.

The public default-options helper has a bounded 64-pattern compilation cache. Distinct-pattern cases deliberately defeat that cache, and reused matchers rotate through different paths. No result cache or benchmark-only execution path is used.

[Final Node samples](results-node.json) and [final Bun samples](results-bun.json) include all raw samples, controls and source hashes. [Initial Node samples](baseline-node.json) and the intermediate [Node](interpreter-node.json)/[Bun](interpreter-bun.json) recordings retain the earlier implementation costs. The initial benchmark had fewer cases and repeated some inputs; compare their recorded workloads before drawing before/after conclusions.

The initial implementation repeatedly compiled public-call patterns and used generic position sets for simple paths, range segments and exclusions. Bounded private compilation reuse and specialized literal/prefix/suffix/one-globstar/range/exclusion evaluation remove those avoidable allocations while retaining the general bounded interpreter and differential tests.

Run the [conformance commands](../../../scripts/minimatch-conformance/README.md) before recording; run Node and Bun benchmarks sequentially.

The subsequent Linux caller correction keeps dot and parent-directory segments literal under `nocase`. These recordings predate that narrow classification fix; their original source hashes are retained.
