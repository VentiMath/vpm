# Material typography creation

The full 14-variant scale is constructed on every iteration. Compare the default scale, VentiMath’s Geist/13px options, and a synthetic nested responsive override with Material 7.2.0. Nested option objects are isolated from the caller and from other variants.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Default scale | 1.698 | 2.172 | +27.8% | higher time in every pair, beyond control spread |
| Node 24 | App Geist scale | 2.030 | 2.710 | +33.9% | higher time in every pair, beyond control spread |
| Node 24 | Responsive variant overrides | 2.047 | 5.363 | +162.1% | higher time in every pair, beyond control spread |
| Bun 1.4.4 | Default scale | 1.432 | 0.852 | -40.5% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | App Geist scale | 1.350 | 0.969 | -28.3% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Responsive variant overrides | 1.696 | 3.105 | +79.5% | higher time in every pair, beyond control spread |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)
