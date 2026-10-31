# Ordered-map comparison fixture

Pins **@js-sdsl/ordered-map 4.4.2**, the latest published release checked October
30, 2026. It has no runtime dependencies. The fixture's full `js-sdsl` package is
only an upstream Vector test helper; Chai/Mocha are test tools. None ship in VPM.

The retained OrderedMap test is from js-sdsl tag `v4.4.2`, commit
`5662fb7f8df48c7def3e979f6fc707ec98e2e534`. The original MIT license and SHA-256
manifest accompany the byte-for-byte snapshot. Its `.txt` suffix prevents Bun's
root test discovery from running an unadapted TypeScript fixture.

`run.cjs` verifies the hashes, compiles a temporary copy with the workspace's
TypeScript 7 compiler, and changes only the `@/index` import to a bridge. The
bridge supplies the selected OrderedMap and original Vector. All **14 test
bodies and assertions remain unchanged**; there are no skips. The harness seeds
`Math.random` identically for both variants. No upstream installed file changes.

`differential.cjs` checks **54,500 deterministic mixed operations and bounds**
with both comparator directions and both index settings. It also demonstrates
four original-package bugs: foreign-map key mutation, sentinel-value poisoning,
the wrong reverse-end predecessor, and NaN position deletion emptying a singleton. VPM's unit suite adds invalid positions,
clear/detach invalidation and independent red-black/subtree-size invariants.

`consumers.cjs` compiles the installed, unchanged **@grpc/grpc-js 1.14.7** Channelz
module from the existing [protobuf fixture](../protobuf-conformance/README.md).
Each evaluation owns its registries; only the ordered-map import is substituted.
`callers.cjs` verifies all seven handlers, ordered pages with deleted IDs, all three
child reference-count maps, missing IDs, disabled registration and cleanup. The
Node/Bun integration gate separately aliases ordered-map in the existing real
gRPC/Google SDK caller stack. Channelz is diagnostics, not transport framing.

```sh
npm --prefix scripts/ordered-map-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/ordered-map-conformance/run.cjs
node scripts/ordered-map-conformance/run.cjs --upstream
node scripts/ordered-map-conformance/differential.cjs
node scripts/ordered-map-conformance/callers.cjs
node scripts/ordered-map-conformance/callers.cjs --upstream
```

Run those checks with `bun` as well. The [package contract](../../packages/vordered-map/README.md)
documents intentional differences; [benchmarks](../../packages/vordered-map/bench/results/README.md)
include actual Channelz methods, original controls and source hashes.
