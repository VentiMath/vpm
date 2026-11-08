# Isolated measurements

Measured on Node 24.22.1 and Bun 1.4.4, Apple M1 Pro, against highlight-words 2.0.0.
Four comparison pairs balance AB/BA order in fresh processes; two identical-source
pairs measure noise. Each worker warms up and validates outside timing; 12 raw
rounds, calibration, implementation/caller hashes and controls are retained.
A direction is established only when every pair agrees beyond the control spread.

| Workload | Node upstream → VPM (ns/op) | Bun upstream → VPM (ns/op) |
| --- | ---: | ---: |
| short cell, no match | 561 → 75; 87.3% lower time | 328 → 49; 84.8% lower time |
| short cell, single match | 1,323 → 237; 82.1% lower time | 631 → 131; 80% lower time |
| cell, multiword filter | 1,938 → 371; 81.2% lower time | 1,000 → 217; 79.5% lower time |
| context clipping | 3,634 → 1,234; 66.1% lower time | 2,095 → 1,161; 45.4% lower time |
| long text, captured regex | 49,492 → 13,839; 72.5% lower time | 31,016 → 11,593; 63.9% lower time |
| actual MRT cell SSR | 24,842 → 18,723; direction unestablished | 15,457 → 13,040; direction unestablished |

All five helper workloads take less time beyond their controls on both runtimes.
For a short matched cell the paired reduction is 82.1% on Node and 80.0% on Bun.
Stable range keys avoid random-key generation, range extraction avoids repeated
regex tests, and a one-entry pattern cache helps repeated table filters. Each
helper workload repeatedly uses one query, as multiple cells under the same table
filter do; these measurements do not establish cold-query latency. Regex objects
are cloned each call and are not cached.

**No complete-cell rendering speedup is established on either runtime.** Both SSR
medians are lower, but at least one comparison falls within the identical-source
noise. Node controls were particularly noisy (up to 41.3% for a helper and 38.7%
for SSR); all samples remain visible rather than selecting a favorable rerun.
The helper gains still exceed those controls in every comparison. Percentages
are paired estimates and can differ from ratios of the displayed overall medians.

The final case renders the unchanged Material React Table cell using production
React 19.1 with MUI and synthetic table props. Setup and module loading are outside
timing. It is not a browser interaction measurement or an application latency
claim. Separate Chrome checks establish the meaningful DOM benefit: unchanged
highlight spans retain identity instead of being recreated on every parent render.
No mounted-app or screen-reader performance claim is made.

[Node raw samples](node-isolated.json) · [Bun raw samples](bun-isolated.json)

Reproduce after installing and building the [fixture](../../../../scripts/highlight-words-conformance/README.md):

```sh
bun scripts/highlight-words-conformance/build.cjs
OUTPUT=packages/vhighlight-words/bench/results/node-isolated.json node packages/vhighlight-words/bench/compare.cjs
OUTPUT=packages/vhighlight-words/bench/results/bun-isolated.json bun packages/vhighlight-words/bench/compare.cjs
```
