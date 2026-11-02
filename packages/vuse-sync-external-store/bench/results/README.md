# External-store measurements

Recorded November 1, 2026 on Node 24.22.1 and Bun 1.4.0 (Apple M1 Pro).
Compared `use-sync-external-store` 1.7.0 with VPM, both using production React /
React DOM 19.1.0. Each timed process runs one implementation. Four balanced
AB/BA comparisons and two identical-source control pairs use the shared
[process harness](../../../../scripts/bench-process.cjs); validation and warmup
are outside timing, and no raw sample is trimmed.

Median process times, nanoseconds per operation:

| Case | Node original → VPM | Bun original → VPM |
| --- | ---: | ---: |
| Server rendering with selector | 1,448 → 1,444 | 1,242 → 1,141 |
| Update to an unselected field | 196 → 191 | 156 → 169 |
| Selected-field update plus render | 3,642 → 3,617 | 2,674 → 3,038 |

**No directional performance claim is established** by the harness's
conservative check across all process pairs and control spread. Bun has higher
update medians and a substantial slow-process outlier retained in the raw data;
these figures do not establish a reliable improvement or regression magnitude.
The purpose is smaller, independently maintained React 19 selector support.
Native subscriptions are React's own hook, so no speedup is claimed for them.

The mounted cases use JSDOM and `flushSync`, and include React/DOM work. They
measure this fixture, not end-user browser frame rates. The application has not
adopted the replacement. Representative outputs are checked before warmup and after the sample loops.

Reproduce serially from the repository root:

```sh
npm --prefix scripts/external-store-conformance ci --ignore-scripts --no-audit --no-fund
OUTPUT=packages/vuse-sync-external-store/bench/results/node.json node packages/vuse-sync-external-store/bench/compare.cjs
OUTPUT=packages/vuse-sync-external-store/bench/results/bun.json bun packages/vuse-sync-external-store/bench/compare.cjs
```

[node.json](node.json) and [bun.json](bun.json) contain source hashes, every raw
sample, per-process ordering, control spread and the summarized evidence. Use
`verify(report, packageRoot)` from the harness to check hashes and recompute
summaries.
