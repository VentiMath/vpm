# Material button measurements

Recorded November 13, 2026 on Node 24.22.1 and Bun 1.4.4 with React 19.3.1.
Controls are Material 9.5.0 and app-pinned 7.2.0. Production bundles render the
same synthetic controls beneath the corresponding Material theme provider; the
candidate uses VPM System and its entire styling closure. Themes and React trees
are prepared outside timing. Each operation renders twelve ordinary or icon
buttons, or seven controlled toggle buttons. Output validation checks button
count, disabled semantics and selected values outside timing.

Four isolated AB/BA comparison pairs and two identical-source control pairs
retain raw samples and source hashes in [Node](node.json) and [Bun](bun.json).
These are SSR operations, not browser interactions or application page speed.

| Case | Node vs control | Bun vs control |
| --- | ---: | ---: |
| Material9 buttons SSR | +0.4% uncertain | -8.5% uncertain |
| Material9 icons SSR | +20.9% | +13.1% uncertain |
| Material9 toggles SSR | -4.0% uncertain | -6.7% uncertain |
| App7 buttons SSR | -8.4% uncertain | -8.9% uncertain |
| App7 icons SSR | +20.3% | +25.5% uncertain |
| App7 toggles SSR | +5.1% uncertain | -1.9% uncertain |

Negative means less elapsed time. Node icon-button SSR remains slower in every
pair beyond control variation: 20.9% versus Material9 and 20.3% versus app7
(about 56–63 microseconds per twelve-icon render). Every Bun result and the other
Node comparisons are inconclusive at this precision, including ordinary buttons
and toggle groups. No general performance improvement or application speedup is
claimed. These reports describe the final implementation, including correct
CSS-variable state opacity and the ordinary icon path without a loading wrapper.

```sh
node scripts/mui-material-conformance/build.cjs
OUTPUT=packages/vmui-material/bench/results/node.json node packages/vmui-material/bench/run.cjs
OUTPUT=packages/vmui-material/bench/results/bun.json bun packages/vmui-material/bench/run.cjs
```
