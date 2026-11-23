# vglob measurements

Node 24.22.1 and Bun 1.4.4 on Apple M1 Pro, macOS arm64. Glob 14.0.6 is the
control. Four fresh-process comparison pairs alternate AB/BA; two identical-source
control pairs measure noise. Each pair uses the same iteration count. Warmup,
fixture creation and output validation are outside timing; no samples are trimmed.

Changes below are median paired process ratios (negative means less time).
A dagger marks differences the harness cannot establish beyond its control spread.

| Case | Node change | Bun change |
|---|---:|---:|
| cold wildcard search 48 files | -8.7% † | -1.5% † |
| cold literal path | -51.6% | +3.7% † |
| warm cached search 48 files | +15.8% † | -34.5% |
| cleanup array with ignored subtree | +23.8% † | +8.3% |
| warm async search 48 files | -2.9% † | -40.0% |
| warm async stream 48 files | +7.5% † | -28.1% |

Node literal lookup and Bun cached lookup/async/streaming are consistently faster
in this run. The array cleanup case is **8.3% slower on Bun**. Its Node median is
23.8% higher, but the run does not distinguish that effect reliably from noise.
Other daggered results do not establish a gain or regression. These are small
filesystem fixtures, not an application build-speed claim.

The implementation caches relative path conversion without caching match results,
skips recursive states for known non-directory entries when a later segment must
match, and consumes cached directory reads without an asynchronous round trip.
Ignore checks, abort behavior and symlink handling remain covered by conformance
and unchanged cleanup callers.

```sh
OUTPUT=packages/vglob/bench/node.json node packages/vglob/bench/compare.cjs
OUTPUT=packages/vglob/bench/bun.json bun packages/vglob/bench/compare.cjs
```

[Node raw samples](node.json) · [Bun raw samples](bun.json). The JSON records
source hashes, per-process medians, order effects and identical-source controls.
