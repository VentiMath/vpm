# CSS source-map measurements

Compared with source-map-js 1.2.4 on Node 24.22.1 and Bun 1.4.4. Each map contains 128 CSS positions. Balanced process pairs and identical-source controls are included in the raw reports.

| Work per operation | Node upstream → VPM (ns) | Change | Bun upstream → VPM (ns) | Change |
|---|---:|---:|---:|---:|
| generate and serialize 128 CSS positions | 18955 → 12695 | -33.2% | 13438 → 15010 | +14.8% |
| first original position lookup | 13728 → 4654 | -66.1% | 13853 → 3313 | -76.1% |
| warm original position lookup | 200 → 39 | -80.2% | 79 → 33 | -59.0% |

The first lookup includes parsing the map and building the per-line index. Warm lookups reuse that index.

[Node raw samples](node24.json) · [Bun raw samples](bun.json)

The single-pass decoder reduced first lookup from the previously measured 16.49 µs on Node and 19.06 µs on Bun to 4.65 µs and 3.31 µs in this fixture. Each first lookup still validates the complete map.
