# Buffer builder operations

The Sass-shaped case creates an eight-byte builder, writes three length bytes and copies them into an existing packet. The mixed case exercises growth, strings, numbers and snapshots.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| Sass three-byte length header and packet copy | 116 → 90 | -22.2% | 42 → 29 | -31% † |
| write mixed fields and snapshot | 596 → 277 | -52.8% | 248 → 229 | -7.7% † |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
