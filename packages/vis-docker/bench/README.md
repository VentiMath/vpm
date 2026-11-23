# Docker detection measurements

Node 24.22.1 and Bun 1.4.4 on Apple M1 Pro (darwin/arm64). Each runtime ran sequentially, with four independent AB/BA pairs and two identical-upstream control pairs. Source hashes and untrimmed samples are in [Node](node.json) and [Bun](bun.json).

| Case | Node upstream → VPM (ns) | Bun upstream → VPM (ns) |
| --- | ---: | ---: |
| cached host detection | 2 → 2 | 2 → 3 |
| fresh module and host probes | 15,113 → 12,038 | 4,224 → 3,597 |
| fresh module and cgroup-v2 probes (simulated) | 4,257 → 106 | 500 → 69 |

Cached calls are approximately 2–3 ns: no useful application-level speed claim follows. Bun's rounded cached result is higher, but one comparison pair reversed direction. Node's fresh-host reduction does not clear identical-control noise (18.8% maximum control spread). Bun's fresh-host calls were 14.1–16.6% lower across all pairs, beyond its 8% control spread.

Fresh cases include module initialization and the first detection, but exclude parsing/import machinery. The current control changes only its import/export declarations to enable the same module factory. Host probes use the actual native filesystem on macOS; the cgroup-v2 case uses deterministic filesystem doubles. That simulated reduction mostly measures avoiding a missing-marker exception, not real Linux filesystem speed. Neither case establishes Docker, CLI startup or Capacitor build speed. Detection ordinarily runs only once per process.

Reproduce after installing the controls:

```sh
OUTPUT=packages/vis-docker/bench/node.json node packages/vis-docker/bench/compare.cjs
OUTPUT=packages/vis-docker/bench/bun.json bun packages/vis-docker/bench/compare.cjs
```
