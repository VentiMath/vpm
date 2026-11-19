# Accordion server-rendering measurements

Each operation renders eight complete panels, including the heading, summary
button, transition wrappers and details. The three fixtures use the expansion,
gutters, elevation and spacing of WARML, HMMT and article panels. Build the
fixtures with `node scripts/mui-material-conformance/accordion-build.cjs`, then
run `packages/vmui-material/bench/accordion.cjs` on Node 24 or Bun. Each timed
process loads one implementation. Four comparison pairs alternate order, with
two identical-source pairs measuring run-to-run variation.

| Control and panel | Node upstream → VPM (µs) | Node change | Bun upstream → VPM (µs) | Bun change |
|---|---:|---:|---:|---:|
| Material9 hmmt | 659.7 → 665.5 | +1.6% † | 425.8 → 402.7 | -4.5% |
| Material9 warml | 608.2 → 657.7 | +9.5% | 410.0 → 417.5 | +1.8% † |
| Material9 article | 584.9 → 631.5 | +4.9% † | 408.7 → 388.2 | -5.7% † |
| App7 hmmt | 608.0 → 609.1 | +6.1% † | 366.1 → 426.3 | +17.5% † |
| App7 warml | 555.4 → 634.3 | +13.1% | 366.4 → 434.0 | +19.2% |
| App7 article | 503.9 → 586.0 | +15.9% | 330.0 → 416.6 | +25.3% |

† The comparison did not establish a consistent difference beyond the identical-source controls.

[Node raw samples](node24.json) · [Bun raw samples](bun.json)
