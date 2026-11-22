# Toolbar font-size Slider

The control is VentiMath’s Material 7.2.0. Server rendering produces the native range input and seven percentage labels. The mounted case uses jsdom to move from 100% to 110% and back through the controlled React callbacks. It measures JavaScript work. The separate Chrome checks verify pointer geometry, cancellation, keyboard focus and the font size actually applied to the page.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Seven-mark toolbar SSR | 86.74 | 39.92 | -53.5% | lower time in every pair, beyond control spread |
| Node 24 | Mounted 100% to 110% and back | 393.63 | 267.88 | -34.0% | unestablished at this precision |
| Bun 1.4.4 | Seven-mark toolbar SSR | 64.38 | 30.62 | -52.3% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | Mounted 100% to 110% and back | 224.37 | 141.51 | -36.6% | lower time in every pair, beyond control spread |

Four comparison pairs alternate process order. Two identical-source pairs measure control variation. [Node samples](node24.json) · [Bun samples](bun.json)
