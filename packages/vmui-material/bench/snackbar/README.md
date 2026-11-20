# Clipboard confirmation SSR

Each sample renders eight controlled club-article confirmations, either closed or open. The timed section includes server rendering and excludes building the React elements.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| Material9 open Snackbar SSR | 239713 → 178117 | -24.9% | 171728 → 131780 | -22.9% |
| Material9 closed Snackbar SSR | 42443 → 7341 | -82.7% | 29097 → 5247 | -82% |
| App7 open Snackbar SSR | 228248 → 168547 | -25% | 178428 → 138550 | -22.1% † |
| App7 closed Snackbar SSR | 46181 → 7664 | -83.5% | 33872 → 5858 | -82.7% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
