# Isolated measurements

Recorded on Node 24.22.1 and Bun 1.4.4 on Apple M1 Pro. Compared with autosuggest-highlight 3.3.4.

Each implementation runs in a fresh process: four comparison pairs with balanced
AB/BA order and two identical-upstream control pairs. Warmup and validation stay
outside timing; every raw sample is retained. The conservative evidence label
requires all comparison directions to agree and exceed the observed control spread.
No shared JIT callsite, result cache or selective sample removal is used.

| Workload | Node upstream → VPM (ns/op) | Bun upstream → VPM (ns/op) |
| --- | ---: | ---: |
| navigation prefixes | 1,525 → 293; 80.7% lower time | 911 → 174; 80.8% lower time |
| navigation misses | 1,269 → 232; 81.8% lower time | 739 → 131; 82.4% lower time |
| multiple query terms | 2,518 → 626; 75.2% lower time | 1,438 → 305; 78.8% lower time |
| accented and ligature labels | 1,672 → 928; direction unestablished | 1,053 → 852; 19.3% lower time |
| all occurrences inside words | 3,302 → 659; 80% lower time | 2,056 → 465; 77.4% lower time |
| split highlight parts | 63 → 63; direction unestablished | 54 → 41; 25% lower time |
| navigation search and rendered parts | 35,545 → 7,515; 78.8% lower time | 25,424 → 5,758; 77.4% lower time |

Navigation-search work takes about **79% less time on Node and 77% less on Bun**
in these synthetic workloads. That measures filtering and highlight-part creation,
not React rendering, network search, page load or application adoption. No end-user
latency claim follows from a microsecond-scale helper benchmark.

The first implementation normalized every ASCII letter surrounding an accent and
regressed on accented labels. The final implementation preserves the Unicode offset
checks while bypassing normalization for ordinary ASCII runs. The final Node accent
median is lower (1,672 → 928 ns), but a 58.9% identical-source control spread prevents
a reliable speed claim for that case. Node parse-only results are also unestablished.
Bun shows lower time for all seven measured workloads. No higher-time direction is
established in the final recording. Initial recordings are retained in the local
work evidence; the linked reports measure the final recorded source hashes.

Rotating inputs include hits, misses, repeated terms, options, punctuation and
Latin accents/ligatures. The navigation workload scans synthetic titles with the
caller’s ten-result cap and builds parts; it does not execute a mounted application.
The corrected emoji/decomposed-accent cases are tested separately, since upstream
produces different results and would not be a fair equivalent-output timing control.

[Node raw samples](node-isolated.json) · [Bun raw samples](bun-isolated.json)

Reproduce after installing the pinned [fixture](../../../../scripts/autosuggest-conformance/README.md):

```sh
OUTPUT=packages/vautosuggest-highlight/bench/results/node-isolated.json node packages/vautosuggest-highlight/bench/compare.cjs
OUTPUT=packages/vautosuggest-highlight/bench/results/bun-isolated.json bun packages/vautosuggest-highlight/bench/compare.cjs
```
