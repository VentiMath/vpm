# Babel template elements

Timings use the VentiMath root helper, 7.27.1. Each call parses a complete raw element. The short, escaped and invalid cases each process four elements per operation. The long case parses a single 800-character CSS fragment. The caller observes the cooked length, line count and invalid-escape flag.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Short template elements | 0.094 | 0.051 | -45.6% | lower time in every pair, beyond control spread |
| Node 24 | Long plain template | 2.723 | 0.060 | -97.8% | lower time in every pair, beyond control spread |
| Node 24 | Escapes and line continuations | 0.318 | 0.410 | +29.4% | higher time in every pair, beyond control spread |
| Node 24 | Invalid tagged escapes | 0.357 | 0.343 | -4.5% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Short template elements | 0.042 | 0.090 | +112.3% | higher time in every pair, beyond control spread |
| Bun 1.4.4 | Long plain template | 1.136 | 0.064 | -94.3% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Escapes and line continuations | 0.357 | 0.412 | +16.7% | unestablished at this precision |
| Bun 1.4.4 | Invalid tagged escapes | 0.367 | 0.337 | -8.2% | lower time in every pair, beyond control spread |

Four alternating process pairs with two identical-source control pairs. [Node samples](node24.json) · [Bun samples](bun.json)
