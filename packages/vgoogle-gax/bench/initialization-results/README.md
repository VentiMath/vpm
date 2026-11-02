# GAX initialization measurements

Recorded November 2, 2026 on Node 24.22.1 and Bun 1.4.0 against google-gax 6.14.0.
Each implementation runs alone in fresh processes: four balanced AB/BA pairs,
two identical-source controls, matched iteration counts, twelve rounds and warmup
outside timing. Raw samples and source hashes are in [Node](node.json) and
[Bun](bun.json), without trimming or fixed bias adjustments.

| Runtime | Case | Original ns | VPM ns | Paired change | Evidence |
| --- | --- | ---: | ---: | ---: | --- |
| node | IAM construction / explicit endpoint | 55250 | 52433 | -5.1% | lower time in every pair, beyond control spread |
| node | REST loadProto / empty schema | 377 | 49 | -87% | lower time in every pair, beyond control spread |
| bun | IAM construction / explicit endpoint | 34381 | 33369 | -2.6% | unestablished at this precision |
| bun | REST loadProto / empty schema | 216 | 81 | -62.4% | lower time in every pair, beyond control spread |

The IAM case supplies the same explicit endpoint to both versions and constructs
client settings without opening a connection. It is not a network/auth benchmark.
The empty REST-loader case constructs a fresh root and validates the formerly
mismatched empty shape. These narrow comparisons do not establish whole-SDK or
application improvements. Default/custom IAM stub creation, option preservation
and invalid-target rejection are covered by correctness tests, outside timing.

Reproduce with `OUTPUT=packages/vgoogle-gax/bench/initialization-results/node.json
node packages/vgoogle-gax/bench/initialization.cjs`, then the Bun equivalent.
