# Decoration-model measurements

[Node 24 recording](node24.json) · [Bun recording](bun.json)

Four balanced pairs plus two identical-source controls run each implementation
in a separate process. Both use identical upstream document/mapping dependencies,
isolating the decoration model. Recorded at the decoration milestone commit `21e376c`; its runtime hashes were verified then. The decoration runtime is unchanged by the later renderer milestone; the manifest and conformance dependency lock now also describe the renderer. These are
model microbenchmarks, not browser/editor latency measurements.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| Create one selection highlight | 2,770 → 253 ns | 1,315 → 239 ns |
| Index 100 inline decorations | 32.75 → 60.22 μs | 28.56 → 53.48 μs |
| Find in a narrow range | 275 → 45 ns | 221 → 64 ns |
| Map 100 decorations through one insertion | 0.78 → 8.20 μs | 0.95 → 9.41 μs |
| Add a widget to 100 decorations | 2.74 → 1.46 μs | 1.80 → 1.65 μs |
| Remove one of 100 decorations | 629 → 1,136 ns | 747 → 1,767 ns |

Each direction holds across all four pairs beyond the recorded control spread.
The app-shaped single-highlight creation, narrow query and widget addition cases
are faster. Bulk creation, mapping and removal remain slower: mapping is roughly
10× upstream despite retaining untouched branches. The implementation checks
mapping steps and document identity before reusing branches and still builds a
new index of child locations. Bulk indexing partitions many individual ranges.
These costs remain explicit optimization work before full editor acceptance;
this internal milestone makes no overall speedup or adoption claim.

Run `node packages/vprosemirror-view/bench/compare.cjs` and the same command with
Bun. Set `OUTPUT` to retain the full report. All process samples and control pairs
are retained without trimming. The earlier full-rebuild diagnostic was used to
repair indexing costs and is not included as a current benchmark.
