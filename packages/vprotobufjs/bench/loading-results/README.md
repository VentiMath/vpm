# Bundled-schema loading measurements

Recorded November 2, 2026 on Node 24.22.1 and Bun 1.4.0 against protobuf.js 8.8.1.
Both implementations receive the same prefixed wrapper-schema path and an explicit
`resolveAll()` call. Each timed operation creates a new Root. The duplicate case
loads three aliases into that root. Validation verifies the canonical file list,
message lookup and a wrapper wire round trip outside timing.

Four fresh-process AB/BA pairs and two identical-source controls use matched
iterations, twelve rounds, 150 ms warmup and retained results. Source hashes,
controls and untrimmed samples are in [Node](node.json) and [Bun](bun.json).

| Runtime | Case | Original ns | VPM ns | Paired change | Control spread | Evidence |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| node | load and resolve bundled wrappers | 13116 | 11546 | -11.8% | 3% | lower time in every pair, beyond control spread |
| node | load duplicate bundled aliases | 14031 | 12058 | -14.4% | 1% | lower time in every pair, beyond control spread |
| bun | load and resolve bundled wrappers | 12501 | 7900 | -37.1% | 6.3% | lower time in every pair, beyond control spread |
| bun | load duplicate bundled aliases | 13375 | 10217 | -24.2% | 8.1% | lower time in every pair, beyond control spread |

These measurements replace the Node regression recorded in commit 7fce9c5.
Profiles identified repeated namespace-list materialization, per-child getter
allocation and garbage collection. Namespace child lists now cache like field
lists, with invalidation on addition/removal/reparenting and replacement. Child
properties hold the same object directly instead of allocating getter closures.
Codec invalidation reuses the child list. Validation, resolver behavior, fresh
Root instances and independently owned reflection graphs are preserved; no
cross-root schema cache is introduced.

Both Node cases now take 12–14% less time than upstream, and Bun takes 24–37%
less. These are fresh reflection-graph construction and resolution costs, not
wire-operation or network timings. Absolute timings from different runs are not
used as a before/after comparison. Mutation regression tests, schema alias checks,
full Firestore conformance and existing binary/descriptor checks remain passing.
Firestore caches its root after initial load; this is not an application latency
claim. The previous reports remain in git history.

Reproduce with `OUTPUT=packages/vprotobufjs/bench/loading-results/node.json node
packages/vprotobufjs/bench/loading.cjs`, then the corresponding Bun command.
