# Independent protobuf runtime measurements

Recorded November 2, 2026 on Apple M1 Pro, Node 24.22.1 and Bun 1.4.0,
against protobuf.js 8.8.1 with its original long dependency. These reports replace
the first independent-runtime results in commit c55122c. They record the codec
implementation in commit 4701d85. The subsequent schema-path repair leaves those
wire operations unchanged; its runtime-directory hash differs and its separate
[loading measurements](../loading-results/README.md) cover that path.

Each implementation runs alone in fresh processes, in balanced AB/BA order.
Four process pairs, two identical-source control pairs, twelve timed rounds,
150 ms warmup and four warmed blocks per worker use the repository process
harness. Iteration counts are fixed within each pair. Outputs are retained and
validated outside timing. Source/fixture hashes and every sample are in the
reports; no fixed bias correction or sample trimming is applied.

Reproduce with `node packages/vprotobufjs/bench/application.cjs`, then `bun`
in place of `node`. `QUICK=1` is validation-only, not timing evidence.

## Results

Times are medians in nanoseconds; positive paired changes mean more time.
Inconclusive rows have mixed pair directions, overlap identical-source control
spread or fall below the harness's 2% descriptive threshold. They establish
neither an improvement nor a regression. This is not a statistical significance test.

| Runtime | Case | Upstream ns | VPM ns | Paired change | Control spread | Evidence |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Node 24 | small reflected message / encode | 161 | 144 | -11% | 1.6% | Inconclusive |
| Node 24 | small reflected message / decode | 74 | 49 | -33.5% | 1.7% | Lower time in every pair |
| Node 24 | packed uint32 reader | 36 | 29 | -21.2% | 2.5% | Lower time in every pair |
| Node 24 | real proto-loader / serialize | 934 | 808 | -13.2% | 2.8% | Lower time in every pair |
| Node 24 | real proto-loader / deserialize | 1210 | 717 | -40.5% | 1.1% | Lower time in every pair |
| Node 24 | generated Firestore Document / encode | 446 | 428 | -4.4% | 2.1% | Inconclusive |
| Node 24 | generated Firestore Document / decode | 525 | 437 | -17% | 1.6% | Lower time in every pair |
| Bun | small reflected message / encode | 246 | 77 | -68.6% | 1.4% | Lower time in every pair |
| Bun | small reflected message / decode | 67 | 54 | -17.1% | 2.5% | Lower time in every pair |
| Bun | packed uint32 reader | 18 | 15 | -16.2% | 27.3% | Inconclusive |
| Bun | real proto-loader / serialize | 737 | 537 | -26.8% | 3.4% | Lower time in every pair |
| Bun | real proto-loader / deserialize | 833 | 586 | -29.7% | 5.5% | Lower time in every pair |
| Bun | generated Firestore Document / encode | 589 | 400 | -31.9% | 1% | Lower time in every pair |
| Bun | generated Firestore Document / decode | 357 | 326 | -8.1% | 2.9% | Lower time in every pair |

No higher-time result is established across the seven tracked workloads on either
runtime. Some small cases remain inconclusive; this is not a universal or
end-to-end application speed claim. The package remains unreleased and unadopted.

## What changed

Profiles identified repeated schema interpretation and conversion, generic
message constructors, short-string Buffer calls, and temporary writer/64-bit
objects. Constructors and scalar/repeated/map/nested codecs now specialize once
per schema. Closed enum/group paths and environments blocking dynamic functions
retain the checked interpreter. Short UTF-8 writes avoid two passes; longer
Unicode strings stay native. Node and Bun use different ASCII read cutoffs; Bun
uses one flat string for very short ASCII instead of concatenating fragments.
Single-byte reads and writes, packed uint32 reads, small delimiters and final
copies avoid unnecessary dispatch or allocation.

Bounds restoration, explicit-length validation, UTF-8 checks, closed enums,
prototype-safe keys, recursion limits and owned writer results remain tested.
Compiled/interpreted parity tests cover mixed messages and undefined byte entries.
Additional tests cover lone surrogates, prefix boundaries, buffer growth, throwing
packed destinations and integer-word coercion. Existing generated Google messages
still use their original code with VPM's reader and writer.

Earlier absolute timings were recorded in a different run; compare the paired
upstream/VPM ratios in these reports rather than subtracting old nanoseconds.
Earlier independent and derived-runtime reports remain available in git history.
