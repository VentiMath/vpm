# Scroll-isolation measurements

Recorded November 2, 2026 on Apple M1 Pro, Node 24.22.1 and Bun 1.4.0,
against react-remove-scroll 2.7.2 with React 19.1. Each implementation runs
alone in fresh processes: four balanced AB/BA comparison pairs, two
identical-source controls, matched iteration counts, twelve rounds and warmup
outside timing. [Node](node.json) and [Bun](bun.json) retain raw samples and
source hashes, without trimming or fixed bias adjustments.

| Runtime | Case | Original ns | VPM ns | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| Node | Server render | 18886 | 17476 | -7.5% | Lower in every pair, beyond control spread |
| Node | Outside wheel, one active lock | 6453 | 6756 | +4.4% | Inconclusive |
| Node | Outside wheel, eight active locks | 7319 | 6627 | -10.0% | Lower in every pair, beyond control spread |
| Bun | Server render | 7500 | 6796 | -9.4% | Lower in every pair, beyond control spread |
| Bun | Outside wheel, one active lock | 3251 | 3163 | -3.4% | Inconclusive |
| Bun | Outside wheel, eight active locks | 3815 | 3200 | -15.1% | Lower in every pair, beyond control spread |

Paired changes summarize per-process comparisons, not ratios of the rounded
aggregate times. The single-lock Node result has a +0.7% to +7.8% pair range
against a 7.6% maximum absolute control difference; Bun's range is -5.1% to
-2.1% against a 2.7% control difference. Neither establishes a difference
beyond the observed noise.

The event cases mount real components in jsdom with scrollbar styling disabled,
then dispatch a new cancelable wheel event on the body outside React capture.
Both implementations must prevent it. Nested active locks demonstrate the
shared listener set; they do not simulate browser layout, touch gestures,
scrollable-content traversal or application frame rates. Setup, bundling,
mounting and cleanup are outside timing. Correctness checks cover those other
event paths separately.

Reproduce from the repository root:

```sh
OUTPUT=packages/vreact-remove-scroll/bench/results/node.json node packages/vreact-remove-scroll/bench/compare.cjs
OUTPUT=packages/vreact-remove-scroll/bench/results/bun.json bun packages/vreact-remove-scroll/bench/compare.cjs
```
