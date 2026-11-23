# Terminal sequence measurements

Node 24.22.1 and Bun 1.4.4, sisteransi 2.0.0 control. Each operation varies its
arguments across 16 values, avoiding constant-input JIT folding. Four balanced
AB/BA process pairs and two identical-upstream control pairs use the repository's
isolated harness, matching iteration counts and validating outside timing. No
samples are discarded.

| Operation | Node upstream ns | Node VPM ns | Bun upstream ns | Bun VPM ns |
| --- | ---: | ---: | ---: | ---: |
| Move cursor | 43 | 43 | 12 | 12 |
| Position cursor | 43 | 42 | 9 | 10 |
| Clear 4–19 lines | 260 | 51 | 106 | 46 |
| Clear 80–95 lines | 1,789 | 76 | 738 | 97 |
| Next line and erase | 62 | 46 | 41 | 48 |

Repeated erase blocks take less time in every pair beyond control variation.
Movement and positioning differences are inconclusive. Next-line-plus-erase is
26% lower on Node but **17% higher on Bun** (7 ns); validation remains enabled.
These are string-generation costs, not measured terminal or app responsiveness.

Run `OUTPUT=packages/vsisteransi/bench/results/node24.json node
packages/vsisteransi/bench/compare.cjs`; substitute `bun` and `bun.json` for Bun.
[Node trials](results/node24.json) and [Bun trials](results/bun.json) retain source
hashes, order effects, controls and all samples.
