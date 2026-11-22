# Material palette creation

Compares the independent palette factory with the app’s Material 7.2.0, including all six roles and augmentation callbacks. Each iteration creates a new palette. Bundling and module initialization occur before timing.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Default palette | 31.310 | 15.005 | -52.2% | lower time in every pair, beyond control spread |
| Node 24 | Dark palette | 27.818 | 14.379 | -48.4% | lower time in every pair, beyond control spread |
| Node 24 | Custom theme palette | 37.642 | 19.829 | -46.1% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Default palette | 16.152 | 15.586 | -6.9% | unestablished at this precision |
| Bun 1.4.4 | Dark palette | 15.259 | 15.796 | +5.3% | higher time in every pair, beyond control spread |
| Bun 1.4.4 | Custom theme palette | 20.800 | 20.188 | -5.1% | unestablished at this precision |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)
