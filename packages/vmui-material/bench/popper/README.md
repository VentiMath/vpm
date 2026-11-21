# Toolbar search Popper

The mounted case in jsdom changes a list with one result to an empty-results message and back. It checks that the same panel remains mounted, yielding to the event loop after each render. The control refreshes Popper positioning on renders. VPM uses geometry observers. jsdom has no layout engine or native ResizeObserver, so the mounted figures describe JavaScript work with stable geometry. Chrome conformance tests exercise real layout separately.

Server cases use the default portal, which renders an empty string on the server. The control is VentiMath’s Material 7.2.0.

| Operation | Node 24 upstream → VPM (µs) | Paired change | Bun 1.4.4 upstream → VPM (µs) | Paired change |
|---|---:|---:|---:|---:|
| Mounted results to empty and back | 4278.37 → 87.83 | -97.9% | 2833.36 → 37.14 | -98.7% |
| Closed portal SSR | 4.45 → 1.24 | -72.1% | 2.75 → 0.87 | -67.6% |
| Open portal SSR | 4.87 → 1.68 | -65.6% | 3.19 → 1.19 | -62.7% |

Four comparison pairs alternate order in fresh processes, plus two identical-source control pairs. [Node samples](node24.json) · [Bun samples](bun.json)
