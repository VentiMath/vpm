# Composing frontend source maps

All three cases return encoded maps. The full transform traces a generated identity map through Babel’s 4,947-segment printer map. Each output is compared with upstream before and after timing.

| Operation | Node 24 upstream → VPM (µs) | Paired change | Bun 1.4.4 upstream → VPM (µs) | Paired change |
|---|---:|---:|---:|---:|
| Small single map | 12.0 → 6.5 | -45.2% | 9.7 → 6.2 | -36% |
| Babel printer map | 818.9 → 569.4 | -31.5% | 609.4 → 524.8 | -14.2% |
| Loaded printer transform | 1139.8 → 696.0 | -38.9% | 769.4 → 671.7 | -12.4% |

Four comparison pairs alternate order in fresh processes. All differences exceeded the identical-source control spread. [Node samples](node24.json) · [Bun samples](bun.json)
