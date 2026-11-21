# Browser Buffer floating-point codec

Each sample reads or writes eight values of one width, alternating byte order. Byte arrays are reused and exact results are verified outside the timed region.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| read eight binary32 values | 112 → 29 | -73.8% | 141 → 20 | -85.7% |
| write eight binary32 values | 312 → 77 | -75.7% | 294 → 75 | -74.4% |
| read eight binary64 values | 216 → 63 | -70.8% | 173 → 88 | -49.1% |
| write eight binary64 values | 364 → 95 | -74.1% | 393 → 39 | -89.9% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
