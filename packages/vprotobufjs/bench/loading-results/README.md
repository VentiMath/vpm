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
| node | load and resolve bundled wrappers | 13871 | 15226 | 10.4% | 1.7% | higher time in every pair, beyond control spread |
| node | load duplicate bundled aliases | 14295 | 15954 | 11.3% | 0.8% | higher time in every pair, beyond control spread |
| bun | load and resolve bundled wrappers | 12330 | 8617 | -30% | 3.5% | lower time in every pair, beyond control spread |
| bun | load duplicate bundled aliases | 13324 | 11239 | -14.3% | 5.4% | lower time in every pair, beyond control spread |

Node needs about 1–2 microseconds more per fresh wrapper schema; Bun needs less
time. These are fresh reflection-graph construction and resolution costs, not
wire-operation or network timings. The prior VPM implementation threw on this
path, so this comparison measures the repaired API against upstream. It does
not establish that normalization itself caused the Node difference. Firestore
caches the resulting root after its initial load. No application speed claim
or universal protobuf performance improvement follows from these measurements.

Reproduce with `OUTPUT=packages/vprotobufjs/bench/loading-results/node.json node
packages/vprotobufjs/bench/loading.cjs`, then the corresponding Bun command.
