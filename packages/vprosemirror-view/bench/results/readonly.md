# Read-only rendering and position measurements

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
| Create/destroy | 287.60 → 290.39 μs | 156.83 → 206.62 μs | Unestablished on Node; higher on Bun |
| Change one paragraph | 70.78 → 19.70 μs | 163.88 → 21.09 μs | Lower on both |
| Change one highlight | 67.19 → 27.35 μs | 157.08 → 27.93 μs | Lower on both |
| Repeat identical input | 928 → 420 ns | 330 → 195 ns | Lower on both |
| `domAtPos` | 290 → 201 ns | 278 → 135 ns | Lower on both |
| `posAtDOM` | 300 → 301 ns | 177 → 136 ns | Unestablished on Node; lower on Bun |
| `nodeDOM` | 189 → 146 ns | 220 → 111 ns | Lower on both |

Every established direction holds across all four pairs beyond the control
spread. The JSON reports retain paired changes and process-order summaries;
the table shows independent medians, not precise speedup factors. Node creation
has a 25.9% control spread and does not establish a gain or regression. Bun
creation is about 31% slower (roughly 50 μs additional time), an explicit remaining
renderer optimization before full editor acceptance. This recording does not
isolate its cause or attribute that cost to the position methods.

Lookup cases cycle all document positions after warmup, with an inline wrapper,
a node wrapper and a widget. Reverse-lookup input boundaries are prepared outside
timing. Bounds and DOM sibling offsets are cached for one successful update;
binary search finds the relevant child record. These are repeated lookups within
a document revision, not first-query-after-update measurements. The correctness
suite separately verifies invalidation and round trips through 24 updates.

The renderer skips unchanged subtrees. Equivalent input returns without DOM
writes; independent tests verify retained nodes and widget focus. The earlier
[decoration-model measurements](README.md) still apply to its unchanged runtime.
Bulk creation/mapping/removal regressions remain open; this workload neither
measures nor resolves those costs. No overall editor performance claim is made
while editing, selection, input and custom node views remain unimplemented.

To reproduce after installing the pinned conformance fixture:

```sh
OUTPUT=packages/vprosemirror-view/bench/results/readonly-node24.json node packages/vprosemirror-view/bench/readonly.cjs
OUTPUT=packages/vprosemirror-view/bench/results/readonly-bun.json bun packages/vprosemirror-view/bench/readonly.cjs
```
