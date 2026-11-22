# Babel identifier checks

Each operation classifies eight inputs against the app control 7.28.5. The Unicode batches include supplementary letters, combining marks, join controls and invalid inputs. Timings cover the helper after loading.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | ASCII names | 0.148 | 0.117 | -20.5% | lower time in every pair, beyond control spread |
| Node 24 | Unicode names | 0.718 | 0.072 | -90.0% | lower time in every pair, beyond control spread |
| Node 24 | Mixed code points | 0.861 | 0.068 | -92.1% | lower time in every pair, beyond control spread |
| Node 24 | Strict module bindings | 0.136 | 0.092 | -31.6% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | ASCII names | 0.108 | 0.105 | -3.2% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Unicode names | 0.624 | 0.061 | -90.2% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Mixed code points | 1.239 | 0.042 | -96.6% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Strict module bindings | 0.053 | 0.049 | -7.7% | lower time in every pair, beyond control spread |

Four comparison pairs alternate process order, with two identical-source pairs for the control. [Node samples](node24.json) · [Bun samples](bun.json)
