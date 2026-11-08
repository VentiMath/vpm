# React virtualizer measurements

Recorded November 8, 2026 on Node 24.22.1 and Bun 1.4.0 against
@tanstack/react-virtual 3.14.26 / virtual-core 3.19.11, using production React
19.1.0. Four isolated alternating AB/BA process pairs and two identical-source
control pairs; equal iterations, warmup and validation outside timing. Source
hashes and all samples are retained in the raw reports.

| Case                        | Node upstream → VPM (ns) | Paired change | Bun upstream → VPM (ns) | Paired change |
| --------------------------- | -----------------------: | ------------: | ----------------------: | ------------: |
| SSR empty element list      |              7133 → 4170 |        -41.8% |             3733 → 3404 |         -6.5% |
| SSR 10,000-row viewport     |            72752 → 43947 |        -38.7% |          160237 → 33796 |        -78.8% |
| SSR window viewport         |            24539 → 13990 |        -42.1% |           25298 → 12163 |        -51.9% |
| SSR adapter only, same core |            14346 → 14599 |          2.5% |           12266 → 12229 |          0.2% |

The full-stack nonempty cases take less time in every pair on both runtimes,
beyond identical-source control spread. Node's empty-list case does too; Bun's
empty-list difference is unestablished, with a 39.6% control spread. The same-core
case isolates adapter overhead: its difference is unestablished on both runtimes.
The substantial full-stack improvement therefore primarily reflects the already
completed VPM core, not a claim that this hook is intrinsically faster.

Each operation creates and renders a fresh server component. The 10,000-row
case evaluates geometry for that many records but renders only the viewport.
These measurements exclude client reconciliation, layout, painting, module
startup and actual scrolling, and do not establish an application frame-rate
gain. The browser suite separately checks interaction correctness.

```sh
OUTPUT=packages/vtanstack-react-virtual/bench/results/node.json node packages/vtanstack-react-virtual/bench/compare.cjs
OUTPUT=packages/vtanstack-react-virtual/bench/results/bun.json bun packages/vtanstack-react-virtual/bench/compare.cjs
```

[Node raw report](node.json) · [Bun raw report](bun.json)
