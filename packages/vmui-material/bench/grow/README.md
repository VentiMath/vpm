# Grow transitions for navigation panels

The mounted case opens and closes one panel in jsdom. A synchronous completion callback isolates React and DOM work from the intended animation delay. Server cases render the panel closed or open without an appearance animation.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| App7 mounted open/close (jsdom) | 86610 → 77026 | -10.6% | 57346 → 53402 | -7.1% |
| App7 closed SSR | 3533 → 2699 | -23.7% | 2826 → 2363 | -16.3% |
| App7 open SSR | 3172 → 2664 | -16.4% | 2806 → 2319 | -18.2% |
| Material9 mounted open/close (jsdom) | 90125 → 78536 | -12.6% | 65829 → 56055 | -14.1% † |
| Material9 closed SSR | 3545 → 2761 | -22.4% | 3078 → 2446 | -20.3% |
| Material9 open SSR | 3417 → 2743 | -20.3% | 2928 → 2389 | -18.8% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
