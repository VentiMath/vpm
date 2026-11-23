# Container detection measurements

Node 24.22.1 and Bun 1.4.4 on Apple M1 Pro (darwin/arm64). Four isolated AB/BA pairs plus two identical-source controls per runtime. The final recorded runs had no concurrent VPM tests or installs. Raw samples and source hashes: [Node](node.json), [Bun](bun.json).

| Case | Node upstream → VPM (ns) | Bun upstream → VPM (ns) |
| --- | ---: | ---: |
| cached result | 2 → 2 | 2 → 2 |
| fresh module and Podman marker (simulated) | 16 → 19 | 15 → 13 |
| fresh module and native marker; Docker stubbed | 5,123 → 606 | 1,236 → 583 |

The ordinary missing-marker probe is lower in every pair beyond control spread (about 88% on Node and 53% on Bun), because it avoids constructing an ENOENT exception. Docker detection is stubbed identically in this isolated comparison; this is not a full-container, CLI-startup or build-speed measurement. Fresh cases include module initialization but exclude parsing/import machinery. The native-marker case uses the actual macOS filesystem; the present-marker case is simulated.

Cached calls are about 2 ns. The small simulated/cached differences do not clear the controls consistently, so no speed advantage is established there. The result is ordinarily computed only once per process.

```sh
OUTPUT=packages/vis-inside-container/bench/node.json node packages/vis-inside-container/bench/compare.cjs
OUTPUT=packages/vis-inside-container/bench/bun.json bun packages/vis-inside-container/bench/compare.cjs
```
