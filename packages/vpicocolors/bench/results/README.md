# Isolated formatter measurements

Node 24.22.1 and Bun 1.4.4 on Apple Silicon, 2026-11-18. Four balanced
upstream/VPM process pairs and two identical-source control pairs, with retained
outputs, validation outside timing and raw samples. Picocolors control: 1.1.1.
Lower time is better; this is not an application build benchmark.

| Case | Node upstream → VPM ns | Bun upstream → VPM ns |
|---|---:|---:|
| plain red diagnostic | 10 → 14 | 1 → 1 |
| disabled diagnostic | 6 → 8 | 1 → 1 |
| nested source frame | 121 → 237 | 123 → 166 |
| escape-rich diagnostic | 973 → 1110 | 661 → 807 |

Node retains 12–93% formatter overhead; the absolute differences are roughly
2–114 ns in these cases. Bun's plain and disabled cases have no established
difference; nested/escape-rich cases cost 36%/22% more. Correct restoration of
early closing escapes is covered separately and is not treated as an equivalent
upstream benchmark. Runtime independence and correctness are the reason for this
replacement, not a claim of faster diagnostics.

Reproduce from repository root:

```sh
OUTPUT=packages/vpicocolors/bench/results/node24.json node packages/vpicocolors/bench/compare.cjs
OUTPUT=packages/vpicocolors/bench/results/bun.json bun packages/vpicocolors/bench/compare.cjs
```

[Node raw samples](node24.json), [Bun raw samples](bun.json).
