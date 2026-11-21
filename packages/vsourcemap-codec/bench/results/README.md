# Source-map mappings

Compared with @jridgewell/sourcemap-codec 1.6.0 on a short mappings string and the source map distributed with trace-mapping 0.3.31.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| short encode | 1371 → 351 | -73.8% | 1028 → 200 | -80.5% |
| short decode | 95 → 100 | +5.6% † | 81 → 81 | +0.1% † |
| trace-mapping build encode | 26624 → 46092 | +72.9% | 22115 → 38120 | +73.1% |
| trace-mapping build decode | 53997 → 68091 | +26.2% | 45675 → 71260 | +56.7% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
