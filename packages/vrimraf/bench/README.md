# Rimraf measurements

Recorded against rimraf 6.1.4 on Node 24.22.1 and Bun 1.4.4. Each implementation
runs in a fresh process, using four balanced AB/BA pairs, two identical-source
control pairs and twelve samples per process. The raw files include source
hashes, all samples and the control spread; no samples are discarded.

The destructive workloads include **creating the eight-file fixture as well as
removing it**. These are repeatable create/remove cycles, not isolated deletion
throughput or complete Capacitor build timings. Missing-path cases perform only
the named removal call. Validation and final temporary-directory cleanup happen
outside the timed blocks. The Node and Bun benchmark runs execute sequentially.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| sync missing path | 3.02 → 2.28 µs | 2.91 → 3.06 µs |
| async missing path | 39.27 → 37.78 µs | 28.22 → 32.08 µs |
| create and sync remove archive (8 files) | 2.39 → 2.58 ms | 2.63 → 2.91 ms |
| create and async remove archive (8 files) | 4.89 → 2.71 ms | 2.75 → 3.47 ms |
| create and filtered async remove (8 files) | 3.35 → 3.85 ms | 3.20 → 4.79 ms |
| create and glob remove 8 files | 2.86 → 2.78 ms | 3.86 → 3.02 ms |

**No workload establishes a directional performance claim in this recording.**
Same-source variation and inconsistent pair results are too large. The table
shows medians across process medians, while the raw report's change percentage
is a median of paired ratios; those are different statistics. A higher or lower
table median alone is not evidence of a sustained change.

The initial missing-path probe exposed avoidable batch sorting and ancestor
walking for one path. The final implementation skips that work while retaining
path validation and root protection. Filtered cleanup deliberately performs
additional identity checks and sequential traversal. Glob-expanded independent
roots also run sequentially to avoid alias collisions. Those choices can cost
throughput; this package prioritizes predictable cleanup, and these samples do
not quantify that tradeoff reliably. No faster application build is claimed.

[Node samples](node.json) and [Bun samples](bun.json) describe the committed source.

```sh
OUTPUT=packages/vrimraf/bench/node.json node packages/vrimraf/bench/compare.cjs
OUTPUT=packages/vrimraf/bench/bun.json bun packages/vrimraf/bench/compare.cjs
```
