# MUI System isolated measurements

Current control: **@mui/system 9.5.0**. React **19.3.1**, Node **24.22.1**, Bun **1.4.4**. Each worker times one implementation; four comparison pairs and two identical-upstream controls use balanced process order, equal iterations within each pair, warmup and result validation. Samples are retained without trimming. Percentages are the harness's paired process estimate, not ratios rounded from the table's pooled medians.

| Operation | Node upstream → VPM | Node change | Bun upstream → VPM | Bun change |
|---|---:|---:|---:|---:|
| create application theme | 2,453 → 2,546 ns | +6.0% | 1,013 → 1,628 ns | +61.2% |
| resolve responsive sx | 6,923 → 6,684 ns | -5.3% | 1,532 → 2,985 ns | +87.7% |
| generate theme CSS variables | 5,542 → 5,957 ns | +7.5% | 3,378 → 3,464 ns | +5.1% |
| Box and responsive Stack SSR | 30,327 → 24,551 ns | -16.6% | 15,246 → 15,396 ns | +0.7% |
| styled theme override SSR | 8,354 → 8,206 ns | +0.7% | 4,430 → 5,781 ns | +30.4% |

**Established difference:** Box/Stack SSR takes 16.6% less time on Node. Bun theme creation takes 61.2% more time, responsive sx 87.7% more, and styled override SSR 30.4% more. Other differences do not consistently exceed control/process variation. These are operation measurements, not application frame-rate or startup claims.

The first implementation copied a dynamically constructed 111-property configuration on every theme creation and repeatedly cloned fresh style results. Building the default configuration once in a stable object layout removes the large Node copying cost; assigning into exclusively owned style accumulators avoids repeated cloning while retaining cycle detection, source ownership and prototype-safe writes. The final Node theme/sx differences are unestablished. The remaining Bun regressions are explicit follow-up candidates; no performance parity claim is made.

[Node raw samples and hashes](node-isolated.json) · [Bun raw samples and hashes](bun-isolated.json) · [driver](../run.cjs).

Reproduce from the repository root after installing the conformance fixture:

```sh
OUTPUT=packages/vmui-system/bench/results/node-isolated.json node packages/vmui-system/bench/run.cjs
OUTPUT=packages/vmui-system/bench/results/bun-isolated.json bun packages/vmui-system/bench/run.cjs
```

Run them sequentially with no other local test/benchmark work. The hash record includes the independent runtime closure, control System package, fixture lock, driver and shared harness. Validate recorded hashes with `scripts/bench-process.cjs` before using the report.
