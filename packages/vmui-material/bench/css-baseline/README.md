# App document baseline

The control is Material 7.2.0. Server cases render the baseline and a child with default, dark and CSS-variable themes. The jsdom case changes the theme and cache direction twice while checking that the child remains mounted. Chrome covers the actual CSS cascade separately.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Default document SSR | 6.036 | 5.714 | -5.0% | unestablished at this precision |
| Node 24 | Dark theme overrides SSR | 8.648 | 8.091 | -6.9% | unestablished at this precision |
| Node 24 | CSS-variable schemes SSR | 8.699 | 8.277 | -5.3% | lower time in every pair, beyond control spread |
| Node 24 | Mounted LTR and RTL theme swap | 488.865 | 405.396 | -14.5% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Default document SSR | 4.212 | 3.600 | -14.5% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Dark theme overrides SSR | 6.272 | 5.406 | -15.2% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | CSS-variable schemes SSR | 6.765 | 5.376 | -21.6% | unestablished at this precision |
| Bun 1.4.4 | Mounted LTR and RTL theme swap | 320.825 | 342.934 | +5.9% | unestablished at this precision |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)
