# Stylesheet measurements

Recorded November 2, 2026 on Node 24.22.1 and Bun 1.4.0 against
react-style-singleton 2.2.3. Each implementation runs alone in fresh processes:
four balanced AB/BA pairs, two identical-source control pairs, matched iterations,
12 rounds and warmup outside timing. Raw samples and source hashes are retained
in [Node](node.json) and [Bun](bun.json). jsdom windows are closed after measurement.

| Runtime | Case | Original ns | VPM ns | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| node | stylesheet factory | 32 | 17 | -47.3% | Lower time beyond controls |
| node | active reference add/remove | 339 | 331 | -5.8% | Inconclusive |
| node | DOM insert/remove (jsdom) | 18421 | 18220 | -12.1% | Inconclusive |
| bun | stylesheet factory | 24 | 27 | 0.6% | Inconclusive |
| bun | active reference add/remove | 567 | 475 | -15.3% | Inconclusive |
| bun | DOM insert/remove (jsdom) | 20797 | 18088 | -10.6% | Inconclusive |

Node factory creation is faster in this run. All other comparisons are
inconclusive, with substantial process/control variation; no reference-count or
DOM speed improvement is established. DOM insertion/removal uses jsdom and does
not measure browser layout, painting or application responsiveness.

Reproduce with `OUTPUT=packages/vreact-style-singleton/bench/results/node.json node
packages/vreact-style-singleton/bench/compare.cjs`, then the Bun equivalent.
The benchmark reuses the pinned sidecar fixture and links its React peer locally.
