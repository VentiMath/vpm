# Accessibility isolation measurements

Recorded November 2, 2026 (November 3 UTC), on Apple M1 Pro, Node 24.22.1 and
Bun 1.4.0 against aria-hidden 1.2.6. Each implementation runs alone in fresh
processes: four balanced AB/BA comparison pairs, two identical-source controls,
matched iteration counts, twelve rounds and warmup outside timing. Raw samples
and source hashes remain in [Node](node.json) and [Bun](bun.json), without
trimming or fixed bias adjustments.

| Runtime | Case | Original ns | VPM ns | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| node | flat / 40 siblings | 237515 | 225698 | -4.8% | lower time in every pair, beyond control spread |
| node | nested / 12 levels | 373130 | 396491 | 6.3% | higher time in every pair, beyond control spread |
| node | overlapping / 40 siblings | 295671 | 272007 | -8.1% | lower time in every pair, beyond control spread |
| bun | flat / 40 siblings | 164720 | 172094 | 4.1% | higher time in every pair, beyond control spread |
| bun | nested / 12 levels | 247547 | 271459 | 9.7% | higher time in every pair, beyond control spread |
| bun | overlapping / 40 siblings | 212837 | 217460 | 1.9% | unestablished at this precision |

The measured operation applies isolation and fully undoes it. The overlapping
case acquires two locks and releases both. Setup is outside timing, and each
result validates both hiding and complete cleanup. These are jsdom attribute
operations, not browser layout, screen-reader responsiveness or application
latency. Paired changes summarize individual process comparisons, not ratios
of rounded aggregate times.

Profiling exposed repeated live HTMLCollection rebuilding during attribute
writes. Walking sibling links removes that cost without dropping restoration or
ownership checks. The final nested case still takes 6% more time on Node and 10%
more on Bun; Bun's flat case takes 4% more, while its overlapping case is
inconclusive. Node flat and overlapping cases take 5% and 8% less time. This is
not a universal speed improvement. Correctness differences are documented in the
[package contract](../../README.md).

Reproduce from the repository root:

```sh
OUTPUT=packages/varia-hidden/bench/results/node.json node packages/varia-hidden/bench/compare.cjs
OUTPUT=packages/varia-hidden/bench/results/bun.json bun packages/varia-hidden/bench/compare.cjs
```
