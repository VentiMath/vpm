# Material theme assembly

Compare the app's Material 7.2.0 theme factory with the owned factory on Node
24.22.1 and Bun 1.4.4. Each case builds a fresh theme. CSS-variable cases include
palette channels, semantic tokens and generated variables; the named app-shaped
case is synthetic and uses the app's option pattern, not a full application render.

| Runtime | Case | Upstream µs | VPM µs | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node 24 | Default theme | 59.12 | 22.23 | -63% | lower time in every pair, beyond control spread |
| Node 24 | App-shaped CSS-variable theme | 469.63 | 470.36 | -4.4% | unestablished at this precision |
| Node 24 | Light/dark CSS schemes | 825.14 | 612.84 | -21.4% | unestablished at this precision |
| Bun 1.4.4 | Default theme | 41.51 | 23.48 | -42.2% | lower time in every pair, beyond control spread |
| Bun 1.4.4 | App-shaped CSS-variable theme | 407.68 | 383.93 | -5.3% | unestablished at this precision |
| Bun 1.4.4 | Light/dark CSS schemes | 647.18 | 602.48 | -4.1% | unestablished at this precision |

Four isolated, alternating process pairs and two identical-source controls.
The host was variable, especially in Bun CSS-variable cases; changes inside or
inconsistent with control spread are not established speedups. These timings
do not measure rendering or end-to-end application performance.

[Node samples](node.json) · [Bun samples](bun.json)

```sh
OUTPUT=/tmp/theme-node.json node packages/vmui-material/bench/theme/compare.cjs
OUTPUT=/tmp/theme-bun.json bun packages/vmui-material/bench/theme/compare.cjs
```
