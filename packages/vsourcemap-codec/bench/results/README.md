# Source-map mappings

Compared with the app’s codec 1.5.5 on a short mapping string and the map distributed with trace-mapping 0.3.31.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| short encode | 1415 → 386 | -72.7% | 998 → 210 | -79% |
| short decode | 94 → 106 | +11.4% † | 82 → 82 | +0.4% † |
| trace-mapping build encode | 27531 → 46407 | +68.3% | 22605 → 38270 | +70.4% † |
| trace-mapping build decode | 56105 → 67036 | +21.7% † | 46797 → 73082 | +54.7% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
