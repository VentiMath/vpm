# Source URI resolution

Each operation resolves four sources against the same map URL. The fixtures cover relative build paths, an IPv6 development server and virtual source locations.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| relative map | 3254 → 1826 | -44.1% | 2323 → 1200 | -48.4% |
| absolute map | 3067 → 1949 | -36.9% | 2256 → 1457 | -35.4% |
| virtual and file sources | 1726 → 1304 | -24.4% | 1368 → 978 | -27.9% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
