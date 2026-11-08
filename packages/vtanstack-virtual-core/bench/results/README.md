# Virtualizer measurements

Recorded November 8, 2026 on Node 24.22.1 and Bun 1.4.0 against
@tanstack/virtual-core 3.19.11. Four isolated alternating AB/BA process pairs,
two identical-source control pairs, equal iterations and observed results.
Source hashes and every sample are retained in the raw reports.

| Case | Node upstream → VPM (ns) | Paired change | Bun upstream → VPM (ns) | Paired change |
| --- | ---: | ---: | ---: | ---: |
| Build 10,000-row geometry | 65408 → 35972 | -44.2% | 113316 → 24692 | -78.2% |
| Unchanged visible items | 2495 → 66 | -97.3% | 297 → 94 | -68.2% |
| Scrolling viewport | 4963 → 1316 | -73.6% | 1218 → 495 | -59.4% |
| Resize row and recompute suffix | 120585 → 107989 | -10.9% | 127753 → 55299 | -56.6% |

All four cases take less time in every pair on both runtimes, beyond the
identical-source control spread. The geometry case constructs a fresh instance
and evaluates 10,000 default-key rows. Repeated reads reuse their output;
scrolling moves the viewport through the same list; resizing changes row 17 and
recomputes the affected suffix. Inputs and results are checked outside timing.

The default-index path does not allocate a redundant key array or query an empty
measurement map. Custom keys still receive their own cache, and measured size
overrides remain keyed. Typed position/size buffers and lazy visible objects
are retained in both paths.

These are JavaScript geometry measurements. They exclude browser layout,
painting, React rendering and module startup, and do not establish an
application frame-rate improvement. Current VentiMath call sites do not enable
MRT's virtualization options explicitly.

```sh
OUTPUT=packages/vtanstack-virtual-core/bench/results/node.json node packages/vtanstack-virtual-core/bench/compare.cjs
OUTPUT=packages/vtanstack-virtual-core/bench/results/bun.json bun packages/vtanstack-virtual-core/bench/compare.cjs
```

[Node raw report](node.json) · [Bun raw report](bun.json)
