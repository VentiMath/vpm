# Material transition creation

Compare independently created transition settings and the app’s margin/side-panel strings against Material 7.2.0. Fresh settings cost 10 ns more on Node and 25 ns more on Bun in this run; formatting is faster in every paired process. No application speedup is inferred.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Create transition settings | 0.044 | 0.054 | +22.6% | higher time in every pair, beyond control spread |
| Node 24 | Page margin transition | 0.357 | 0.057 | -83.8% | lower time in every pair, beyond control spread |
| Node 24 | Side-panel transitions | 0.576 | 0.180 | -68.6% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Create transition settings | 0.067 | 0.092 | +44.5% | higher time in every pair, beyond control spread |
| Bun 1.4.4 | Page margin transition | 0.095 | 0.027 | -72.2% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Side-panel transitions | 0.220 | 0.107 | -51.1% | lower time in every pair, beyond control spread |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)
