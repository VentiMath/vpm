# GlobalStyles server rendering

Each measurement uses production React to render one global stylesheet for nested navigation rules, a page theme callback or an array of preview styles. App7 and Material9 identify the two upstream controls.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| App7 navigation SSR | 3578 → 3375 | -6.1% † | 2308 → 2068 | -11.2% † |
| App7 page SSR | 3754 → 3724 | -2.4% † | 2546 → 2426 | -4.9% † |
| App7 frameSheets SSR | 3848 → 3509 | -9.2% | 2234 → 2147 | -4.5% † |
| Material9 navigation SSR | 3626 → 3801 | +1.3% † | 2379 → 2386 | +1.1% † |
| Material9 page SSR | 3894 → 4124 | +6.1% | 2563 → 2550 | 0% † |
| Material9 frameSheets SSR | 3770 → 3875 | +1.6% † | 2323 → 2363 | +1.6% † |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
