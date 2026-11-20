# Varint wire operations

The fixture writes, reads and sizes IDs ranging from one byte to the maximum safe integer using the Sass host’s Buffer API. Individual timings cover codec operations. The Sass integration check measures correctness separately.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| write compilation ID to Buffer | 91 → 9 | -90.5% | 9 → 38 | +346.4% |
| read compilation ID from Buffer | 16 → 14 | -7.7% † | 14 → 11 | -22.3% |
| size outgoing compilation ID | 7 → 9 | +31.7% † | 7 → 5 | -26.2% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
