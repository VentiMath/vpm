# Base64 binary encoding

The same byte arrays and Base64 text feed both implementations. Encoding and decoding are timed separately.

| Operation | Node 24 upstream → VPM (ns) | Paired change | Bun 1.4.4 upstream → VPM (ns) | Paired change |
|---|---:|---:|---:|---:|
| encode 32 bytes | 416 → 159 | -62.3% | 328 → 97 | -70.2% |
| decode 32 bytes | 104 → 105 | -0.2% † | 60 → 65 | +7.7% † |
| encode 4096 bytes | 43843 → 16398 | -62.5% | 37288 → 14135 | -61.9% |
| decode 4096 bytes | 8844 → 8410 | -4.8% † | 5165 → 4535 | -12.8% |

Four comparison pairs alternate execution order in fresh processes. Two identical-source pairs measure run-to-run variation. † marks differences unresolved at this precision.

[Node samples](node24.json) · [Bun samples](bun.json)
