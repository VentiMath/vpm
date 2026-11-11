# Custom-effect completion measurements

Node 24.22.1 and Bun 1.4.4, Motion DOM 14.7.0, 2026-11-11. Separate fresh
processes, four balanced comparison pairs, two identical-source controls, owned
results and raw samples use the repository's standard harness. Every operation
constructs controllers, completes all properties, drains the same microtasks and
manual frame phases, checks final values, stops controllers and releases bindings.
The end-value cases finish with one animated property overwritten and one
end-only property set. This measures CPU setup/completion, not browser frame rate.

| Case | Node upstream → VPM (μs) | Bun upstream → VPM (μs) | Bun paired change |
| --- | ---: | ---: | ---: |
| One property | 5.791 → 8.130 | 3.837 → 4.841 | +26.6% |
| One property with ends | 7.791 → 11.604 | 4.854 → 6.984 | +43.9% |
| Eight properties | 29.383 → 38.762 | 18.090 → 21.717 | +18.6% |
| Eight properties with ends | 29.801 → 34.950 | 21.206 → 24.417 | +14.7% |

All Bun cases are slower in every pair, beyond their control spread. Node medians
are also higher, but order effects, differing pair directions or control overlap
leave all four directions unestablished at this precision. Percentages use paired
process ratios, not the ratio of the two pooled medians. No speedup is claimed.
VPM retains additional snapshot, lifecycle, binding and stale-completion checks;
this benchmark does not isolate the cost of each check.

[Node report](node-isolated.json) and [Bun report](bun-isolated.json) include
all samples, order, controls and source hashes. The [initial Node report](node-initial.json)
is retained too: it overlapped the start of focused tests and had substantial
order variation. The final runs above were recorded after those tests and the
full Bun suite completed, without concurrent test commands from this task.
Existing [setup/binding measurements](../custom-effects/README.md) measure a
different workload and remain historical evidence, not a before/after comparison.

```sh
OUTPUT=packages/vmotion-dom/bench/effect-end/node-isolated.json node packages/vmotion-dom/bench/effect-end.cjs
OUTPUT=packages/vmotion-dom/bench/effect-end/bun-isolated.json bun packages/vmotion-dom/bench/effect-end.cjs
```
