# CSS source-map measurements

Compared with source-map-js 1.2.4 on Node 24.22.1 and Bun 1.4.4. Each map contains 128 CSS positions. Balanced process pairs and identical-source controls are included in the raw reports.

| Work per operation | Node upstream → VPM (ns) | Change | Bun upstream → VPM (ns) | Change |
|---|---:|---:|---:|---:|
| generate and serialize 128 CSS positions | 18790 → 12411 | -33.9% | 13011 → 14048 | +8.4% |
| first original position lookup | 13169 → 16487 | +25.1% | 13767 → 19055 | +37.6% |
| warm original position lookup | 187 → 42 | -77.2% | 76 → 31 | -59.0% |

The first lookup includes parsing the map and building the per-line index. Warm lookups reuse that index.

[Node raw samples](node24.json) · [Bun raw samples](bun.json)
