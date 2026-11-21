# Composing frontend source maps

All three cases return encoded maps. The full transform traces a generated identity map through Babel’s 4,947-segment printer map. Each output is compared with upstream before and after timing.

| Operation | Node 24 upstream → VPM (µs) | Paired change | Bun 1.4.4 upstream → VPM (µs) | Paired change |
|---|---:|---:|---:|---:|
| Small single map | 12.1 → 6.7 | -45% | 9.6 → 6.3 | -35.2% |
| Babel printer map | 828.6 → 565.0 | -31.9% | 673.1 → 536.0 | -20.3% |
| Loaded printer transform | 1123.7 → 703.0 | -37.4% | 780.4 → 669.4 | -15.1% |

Four comparison pairs alternate order in fresh processes. All differences exceeded the identical-source control spread. [Node samples](node24.json) · [Bun samples](bun.json)
