# Filesystem convenience measurements

Recorded against fs-extra 11.4.1 on Node 24.22.1 and Bun 1.4.4. Every timed
implementation runs in a fresh process, with four balanced AB/BA pairs, two
identical-source control pairs and twelve samples per process. All samples and
source hashes are retained; Node and Bun run sequentially.

Copy cases include clearing the destination, copying eight 600-byte files, and
counting the results. Move performs an out-and-back rename and reads the result.
The ensure-file case includes a verifying stat. Initial fixtures and final
cleanup are outside timing. These are filesystem workloads, not isolated
JavaScript throughput or complete Capacitor build timings.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| ensure existing file (sync) | 3.66 → 3.93 µs | 3.43 → 3.96 µs |
| pathExists (async) | 8.15 → 8.25 µs | 12.86 → 11.59 µs |
| output JSON to existing parent (async) | 79.57 → 90.09 µs | 62.13 → 55.03 µs |
| copy eight assets and clear destination (sync) | 2199.75 → 2368.16 µs | 1890.49 → 2137.61 µs |
| copy eight assets and clear destination (async) | 1920.43 → 3581.25 µs | 2285.82 → 2844.74 µs |
| move file out and back (async) | 283.28 → 265.51 µs | 332.77 → 274.84 µs |

**Node paired evidence:**

- ensure existing file (sync): direction unestablished at this precision.
- pathExists (async): direction unestablished at this precision.
- output JSON to existing parent (async): direction unestablished at this precision.
- copy eight assets and clear destination (sync): direction unestablished at this precision.
- copy eight assets and clear destination (async): direction unestablished at this precision.
- move file out and back (async): direction unestablished at this precision.

**Bun paired evidence:**

- ensure existing file (sync): 15.1% higher median paired time; every pair agrees beyond the same-source control spread.
- pathExists (async): direction unestablished at this precision.
- output JSON to existing parent (async): direction unestablished at this precision.
- copy eight assets and clear destination (sync): direction unestablished at this precision.
- copy eight assets and clear destination (async): 26.2% higher median paired time; every pair agrees beyond the same-source control spread.
- move file out and back (async): direction unestablished at this precision.

The asynchronous copy traversal is sequential; current fs-extra processes
entries concurrently. VPM also checks directory aliases and avoids writing
through destination symlinks. The observed asynchronous-copy regression remains
unresolved. The benchmark does not isolate how much each implementation choice
contributes, and no end-to-end build speedup is claimed.

Table values are medians of process medians. Percentages are medians of paired
ratios, so they need not equal the ratio of the table values.

[Node samples](node.json) · [Bun samples](bun.json)

```sh
OUTPUT=packages/vfs-extra/bench/node.json node packages/vfs-extra/bench/compare.cjs
OUTPUT=packages/vfs-extra/bench/bun.json bun packages/vfs-extra/bench/compare.cjs
```
