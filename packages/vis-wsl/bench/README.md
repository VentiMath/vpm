# WSL detection measurements

Node 24.22.1 and Bun 1.4.4 on Apple M1 Pro (darwin/arm64). Each runtime ran separately, with four fresh-process AB/BA pairs and two identical-upstream control pairs. Raw samples and source hashes: [Node](node.json), [Bun](bun.json).

| Simulated module evaluation | Node upstream → VPM (ns) | Bun upstream → VPM (ns) |
| --- | ---: | ---: |
| non-Linux import snapshot (simulated) | 6 → 13 | 7 → 12 |
| WSL kernel import snapshot (simulated) | 37 → 44 | 44 → 42 |
| custom kernel import snapshot (simulated) | 93 → 95 | 71 → 78 |

The non-Linux case is slower beyond the controls: about 7 ns additional work on Node and 5 ns on Bun. The Node Microsoft-kernel case also has about 7 ns extra work. These are small module-evaluation costs, including VPM's helper and marker-list initialization, paid once on ordinary import. The custom-kernel differences and Bun Microsoft-kernel result do not consistently exceed the controls. No speedup is claimed.

The comparison adapts only upstream import/export syntax, compiles both module factories before timing, and supplies the same deterministic process/OS/filesystem/container doubles. It measures decision code and allocation, not native filesystem latency, module loading, CLI startup or Capacitor builds. Ordinary consumers read the exported boolean; they do not repeatedly execute a detector.

```sh
OUTPUT=packages/vis-wsl/bench/node.json node packages/vis-wsl/bench/compare.cjs
OUTPUT=packages/vis-wsl/bench/bun.json bun packages/vis-wsl/bench/compare.cjs
```
