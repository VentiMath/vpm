# WARML preference controls

Each sample server-renders five unrated practice-time controls or three rated relay-position controls. The timing covers the rating rows. It excludes data loading and saving.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| Material9 schedule Rating SSR | 498482 → 337570 | -32.1% | 341727 → 219570 | -35.9% |
| Material9 relay Rating SSR | 267922 → 171723 | -35% | 208810 → 137714 | -34.1% |
| App7 schedule Rating SSR | 433739 → 303962 | -29.8% | 346466 → 221222 | -35.9% |
| App7 relay Rating SSR | 264530 → 166936 | -36.9% | 212070 → 132024 | -36.5% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
