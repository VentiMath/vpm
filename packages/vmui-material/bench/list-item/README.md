# Toolbar list rows

The app control is Material 7.2.0. SSR covers four two-line event and note rows and three labeled settings rows with checkbox actions. The mounted jsdom case reverses the rows, updates their details and restores their initial order. Timings include the list and its text children.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Event and note rows SSR | 119.428 | 116.843 | -3.1% | unestablished at this precision |
| Node 24 | Settings rows with switches SSR | 82.377 | 78.919 | -4.8% | unestablished at this precision |
| Node 24 | Mounted event and note reorder | 394.523 | 349.388 | -11.4% | unestablished at this precision |
| Bun 1.4.4 | Event and note rows SSR | 86.655 | 82.253 | -3.7% | unestablished at this precision |
| Bun 1.4.4 | Settings rows with switches SSR | 64.249 | 66.051 | +1.8% | unestablished at this precision |
| Bun 1.4.4 | Mounted event and note reorder | 228.525 | 232.610 | +2.4% | unestablished at this precision |

Four alternating process pairs with two identical-source control pairs. [Node samples](node24.json) · [Bun samples](bun.json)
