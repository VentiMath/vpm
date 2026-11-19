# Accordion summary/details SSR measurements

Eight summary/details pairs per operation, in collapsed, expanded and compact
parent contexts. Current Material 9.5.0 and app Material 7.2.0 are separate
controls. This measures server rendering, not browser interaction or an app page.
The parent Accordion is not included.

The shared harness alternates isolated processes and includes identical-source
controls. Source hashes and raw samples are retained. Build before measuring:

```sh
node scripts/mui-material-conformance/accordion-parts-build.cjs
OUTPUT=packages/vmui-material/bench/accordion-parts/node24.json node packages/vmui-material/bench/accordion-parts.cjs
OUTPUT=packages/vmui-material/bench/accordion-parts/bun.json bun packages/vmui-material/bench/accordion-parts.cjs
```

Node 24.22.1 / Bun 1.4.4, Apple Silicon, 2026-11-18. Times below are microseconds
per eight summary/details pairs. A percentage without consistent differences
beyond identical-source controls is marked unestablished.

| Case | Node upstream → VPM µs | Node change | Bun upstream → VPM µs | Bun change |
|---|---:|---|---:|---|
| Material9 collapsed | 266.3 → 284.2 | +5.7% | 157.4 → 166.0 | +5.5% (unestablished) |
| Material9 expanded | 241.1 → 281.7 | +16.4% | 158.4 → 167.7 | +3.3% (unestablished) |
| Material9 compact | 239.8 → 224.2 | -6.5% (unestablished) | 147.4 → 156.4 | +5.9% (unestablished) |
| App7 collapsed | 232.0 → 275.2 | +18.0% | 158.0 → 170.4 | +6.3% |
| App7 expanded | 246.0 → 265.4 | +7.8% (unestablished) | 155.3 → 174.4 | +9.8% |
| App7 compact | 219.5 → 223.7 | +2.5% (unestablished) | 146.3 → 157.3 | +7.9% (unestablished) |

The current-control Node collapsed/expanded cases retain 6–16% overhead.
Other rows must be interpreted with their own controls; these timings do not
establish a page-level benefit. The implementation is independent and preserves
the tested interaction contracts.

[Node raw samples](node24.json), [Bun raw samples](bun.json).
