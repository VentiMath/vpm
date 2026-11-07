# Read-only rendering measurements

[Node 24 recording](readonly-node24.json) · [Bun recording](readonly-bun.json)

This measures a 32-paragraph read-only workload in JSDOM against upstream View
1.42.9 with `editable: false`. Upstream still constructs its full EditorView
lifecycle and input infrastructure; VPM implements only the private read-only
renderer. These are not feature-equivalent editors, browser frame timings or
application latency measurements. Documents and states are prepared outside timing.

Four balanced process pairs and two identical-upstream controls use the repository's
isolated harness. All samples are retained, and the final runtime, declarations,
manifest, benchmark and fixture-lock hashes are verified. Both sides use the same
upstream model/state inputs. VPM's rendering and decoration implementations are
included in its measured work.

| Workload | Node upstream → VPM | Bun upstream → VPM | Recorded direction |
| --- | ---: | ---: | --- |
| Create/destroy | 353.94 → 248.53 μs | 157.44 → 195.69 μs | Unestablished on both |
| Change one paragraph | 68.64 → 17.02 μs | 124.46 → 19.15 μs | Lower in every pair on both |
| Change one highlight | 63.15 → 31.59 μs | 155.90 → 25.37 μs | Unestablished on Node; lower in every pair on Bun |
| Repeat identical input | 894 → 465 ns | 301 → 171 ns | Lower in every pair on both |

The supported directions exceed the identical-source control spread in each
pair, but the recordings are noisy. For example, Bun's paragraph-update control
varies by up to 71.7%, and Node creation ranges from 43.9% lower to 122.5% higher.
Do not treat the table's independent medians as precise speedup factors. Creation
and Node highlight results do not establish a gain or regression. The full JSON
reports retain paired changes and process-order summaries.

The renderer indexes sibling records by identity and skips unchanged subtrees.
It disables static schema task controls when creating their shells, rather than
scanning all descendants on every update. Equivalent input returns without DOM
writes; the correctness suite separately verifies retained nodes and widget focus.

The earlier [decoration-model measurements](README.md) still apply to its unchanged
runtime. Its bulk creation/mapping/removal regressions remain open; this workload
neither measures nor resolves those costs. No overall editor performance claim is
made while editing, selection, input and node views remain unimplemented.

To reproduce after installing the pinned conformance fixture:

```sh
OUTPUT=packages/vprosemirror-view/bench/results/readonly-node24.json node packages/vprosemirror-view/bench/readonly.cjs
OUTPUT=packages/vprosemirror-view/bench/results/readonly-bun.json bun packages/vprosemirror-view/bench/readonly.cjs
```
