# Tab and Tabs server rendering

Each sample renders eight complete tab strips on React 19.3.1. The IMO strip has four numeric tabs with icons and labels. The family strip has three named learners selected by ID. These measurements use the default theme. The Chrome fixture separately checks the app’s themed indicator, keyboard interactions and layout.

| Upstream control | Caller | Node 24 upstream → VPM (µs) | Paired change | Bun 1.4.4 upstream → VPM (µs) | Paired change |
|---|---|---:|---:|---:|---:|
| Material 9.5.0 | IMO results | 1181.8 → 1152.2 | -2.5% † | 706.4 → 607.8 | -16.0% † |
| Material 9.5.0 | Family learners | 780.1 → 834.1 | +8.3% † | 516.3 → 417.2 | -19.4% |
| App 7.2.0 | IMO results | 1000.9 → 1098.6 | +9.9% † | 616.7 → 621.6 | -0.8% † |
| App 7.2.0 | Family learners | 702.8 → 777.8 | +8.8% † | 449.0 → 447.6 | +0.0% † |

† Pair-to-pair variation or the identical-source controls leave the difference unresolved. The family strip on Bun took 19.4% less time than Material 9.5.0, with lower time in every comparison pair. Against the app’s Material 7.2.0 neither caller showed a reliable difference.

Build the fixtures with `node scripts/mui-material-conformance/tabs-build.cjs`, then run `packages/vmui-material/bench/tabs.cjs` with Node or Bun. Each runtime uses four comparison pairs and two identical-source pairs with alternating process order. Reported changes are medians of the paired changes.

[Node samples](node24.json) · [Bun samples](bun.json)
