# WARML registration steps

The app control is Material 7.2.0. Server renders use a six-step student path and a three-step volunteer path. The mounted case advances the student form one step and goes back in jsdom. Chrome independently checks layout and retained focus. These measurements cover the step indicator alone.

| Runtime | Operation | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | student registration SSR | 230.839 | 180.792 | -22.0% | lower time in every pair, beyond control spread |
| Node 24 | volunteer registration SSR | 108.075 | 88.664 | -20.5% | lower time in every pair, beyond control spread |
| Node 24 | Mounted next and back, six steps | 740.342 | 592.349 | -24.5% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | student registration SSR | 168.366 | 135.860 | -20.6% | unestablished at this precision |
| Bun 1.4.4 | volunteer registration SSR | 87.608 | 73.122 | -16.5% | unestablished at this precision |
| Bun 1.4.4 | Mounted next and back, six steps | 465.054 | 374.447 | -15.6% | unestablished at this precision |

Four comparison pairs alternate process order, with two identical-source pairs for the control. [Node samples](node24.json) · [Bun samples](bun.json)
