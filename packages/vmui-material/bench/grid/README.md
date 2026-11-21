# IMO archive Grid server rendering

Each sample renders the responsive Grid shells around nine loading placeholders or 24 selectable years. The measurement excludes translation, data fetching and the site’s card contents.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| Material9 placeholders Grid SSR | 92325 → 76133 | -17.7% | 60181 → 42302 | -29.5% |
| Material9 years Grid SSR | 219545 → 177192 | -19.3% † | 152928 → 106192 | -30.4% |
| App7 placeholders Grid SSR | 123740 → 77122 | -37.4% | 72197 → 43455 | -40.6% |
| App7 years Grid SSR | 297663 → 174201 | -41.4% | 174793 → 105584 | -38.9% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
