# Material consumer integration benchmarks

These samples render one TablePagination, an eight-learner Tabs strip, or a useAutocomplete consumer on React 19.3.1. Page, selection and query inputs vary between calls. Controls are Material 7.2.0 (the app) and 9.5.0. The fixtures check the stated semantics separately; independently designed arrow icons and markup do not promise pixel-identical output.

| Control and case | Node 24 upstream → VPM (µs) | Bun 1.4.4 upstream → VPM (µs) |
| --- | ---: | ---: |
| App 7.2.0 pagination SSR | 347.6 → 373.1 | 240.8 → 189.4 |
| App 7.2.0 tabs SSR | 228.0 → 340.4 | 140.3 → 144.2 |
| App 7.2.0 autocomplete hook SSR | 7.4 → 6.4 | 7.8 → 7.3 |
| Material 9.5.0 pagination SSR | 703.0 → 407.6 | 319.7 → 178.5 |
| Material 9.5.0 tabs SSR | 353.1 → 329.3 | 214.8 → 165.2 |
| Material 9.5.0 autocomplete hook SSR | 44.1 → 42.0 | 10.6 → 8.5 |

**All comparisons are inconclusive at this precision.** Identical-source controls varied by 6–57%, and some comparison pairs changed direction. The raw medians above record the run; they do not establish a speedup or a regression. No timing samples were discarded and no performance claim is made from these measurements. Application build durations are not benchmarks.

The standard harness uses four balanced upstream/VPM process pairs and two identical-source control pairs. Each worker times only one implementation, warms up first, checks results outside timing and retains all 12 samples. The app build finished before this benchmark ran, and Node and Bun ran sequentially. Other machine activity is not controlled.

Build with `node scripts/mui-material-conformance/consumer-gaps-build.cjs`, then run `node packages/vmui-material/bench/consumer-gaps.cjs` or the same path with Bun. Set `OUTPUT` to retain the report.

[Node samples](node24.json) · [Bun samples](bun.json)
