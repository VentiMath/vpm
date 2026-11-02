# Scrollbar measurements

Recorded November 2, 2026 on Node 24.22.1 and Bun 1.4.0 against
react-remove-scroll-bar 2.3.8. Each implementation runs alone in fresh processes:
four balanced AB/BA pairs, two identical-source controls, matched iteration
counts, twelve rounds and warmup outside timing. All samples and source hashes
remain in [Node](node.json) and [Bun](bun.json), without trimming or fixed bias
corrections. Outputs are retained and validated outside timing.

| Runtime | Case | Original ns | VPM ns | Paired change | Control spread | Evidence |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| node | gap calculation (fixed layout input) | 88 | 71 | -18.9% | 5.7% | Lower time beyond controls |
| node | React server render | 3268 | 3148 | -3.4% | 1.7% | Inconclusive |
| bun | gap calculation (fixed layout input) | 8 | 5 | -36.3% | 1.9% | Lower time beyond controls |
| bun | React server render | 1512 | 1510 | 0% | 3.5% | Inconclusive |

Gap arithmetic uses fixed, synthetic layout inputs. Direct property reads avoid
building computed-style property names; no browser style recalculation, layout,
painting or scroll handling is timed. SSR produces empty output and exercises
React rendering plus CSS generation, without effects or DOM work. The measured
arithmetic improvement is not an application performance claim, and neither
runtime establishes an SSR difference beyond noise/control spread.

Reproduce with `OUTPUT=packages/vreact-remove-scroll-bar/bench/results/node.json node
packages/vreact-remove-scroll-bar/bench/compare.cjs`, then the Bun equivalent.
The benchmark uses the pinned sidecar fixture and local peer/dependency links.
