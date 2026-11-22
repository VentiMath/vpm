# Material palette helpers

Public System functions re-exported by Material styles, compared with the app’s Material 7.2.0. Workloads exercise translucent text blending and the repeated 4.5 contrast threshold on two backgrounds.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Translucent ink on a paper background | 2.184 | 2.142 | -1.9% | unestablished at this precision |
| Node 24 | Choose a readable role shade | 22.124 | 18.672 | -16.0% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Translucent ink on a paper background | 1.277 | 1.482 | +16.5% | higher time in every pair, beyond control spread |
| Bun 1.4.4 | Choose a readable role shade | 12.269 | 12.834 | +5.1% | unestablished at this precision |

Four alternating process pairs and two identical-source controls. [Node samples](node24.json) · [Bun samples](bun.json)
