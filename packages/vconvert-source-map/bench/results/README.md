# Babel source-map comments

Times are medians in microseconds per operation for the app’s Babel printer map and a small transform. The isolated harness alternates process order and measures same-implementation controls.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | small Babel write | 0.62 | 0.64 | +8.3% | unestablished at this precision |
| Node 24 | small Babel read | 1.26 | 0.86 | -31.1% | unestablished at this precision |
| Node 24 | printer Babel write | 328.10 | 325.88 | +3.8% | unestablished at this precision |
| Node 24 | printer Babel read | 429.40 | 131.51 | -68.2% | unestablished at this precision |
| Bun | small Babel write | 0.36 | 0.36 | +1.0% | unestablished at this precision |
| Bun | small Babel read | 0.70 | 0.42 | -41.2% | lower time in every pair, beyond control spread |
| Bun | printer Babel write | 93.88 | 97.05 | +4.0% | unestablished at this precision |
| Bun | printer Babel read | 196.35 | 78.11 | -60.0% | lower time in every pair, beyond control spread |

[Node measurements](node24.json) · [Bun measurements](bun.json)
