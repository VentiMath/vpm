# Independent protobuf runtime measurements

Recorded November 2, 2026 on Apple M1 Pro, Node 24.22.1 and Bun 1.4.0,
against protobuf.js 8.8.1 with its original `long` dependency.

Each implementation runs alone in fresh processes, in balanced AB/BA order.
Four process pairs, two identical-source control pairs, twelve timed rounds,
150 ms warmup and four warmed blocks per worker use the repository process
harness. Iteration counts are fixed within each pair. Outputs are retained and
validated outside timing. Source/fixture hashes and every sample are in the
reports; no fixed bias correction or sample trimming is applied.

Reproduce with `node packages/vprotobufjs/bench/application.cjs`, then `bun`
in place of `node`. `QUICK=1` is validation-only, not publishable timing evidence.

## Results

Times are medians in nanoseconds; positive paired changes mean more time.
An inconclusive row has mixed pair directions or overlaps identical-source
control spread. It is not evidence of an improvement or a regression.

| Runtime | Case | Upstream ns | VPM ns | Paired change | Control spread | Evidence |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Node 24 | small reflected message / encode | 136 | 198 | +46.8% | 2.8% | Higher time in every pair |
| Node 24 | small reflected message / decode | 62 | 178 | +189.3% | 1.1% | Higher time in every pair |
| Node 24 | packed uint32 reader | 30 | 29 | -7.1% | 4.7% | Inconclusive |
| Node 24 | real proto-loader / serialize | 782 | 1632 | +109.1% | 1.8% | Higher time in every pair |
| Node 24 | real proto-loader / deserialize | 1038 | 1789 | +72.7% | 3.3% | Higher time in every pair |
| Node 24 | generated Firestore Document / encode | 380 | 545 | +43.5% | 1% | Higher time in every pair |
| Node 24 | generated Firestore Document / decode | 435 | 447 | +3.1% | 0.4% | Inconclusive |
| Bun | small reflected message / encode | 212 | 235 | +11.4% | 10.6% | Inconclusive |
| Bun | small reflected message / decode | 53 | 77 | +45.9% | 10.1% | Higher time in every pair |
| Bun | packed uint32 reader | 15 | 39 | +161.4% | 30% | Higher time in every pair |
| Bun | real proto-loader / serialize | 618 | 1176 | +91% | 2.4% | Higher time in every pair |
| Bun | real proto-loader / deserialize | 709 | 1266 | +77.5% | 1.7% | Higher time in every pair |
| Bun | generated Firestore Document / encode | 509 | 444 | -13.3% | 2.1% | Lower time in every pair |
| Bun | generated Firestore Document / decode | 303 | 342 | +13% | 1% | Higher time in every pair |

The reflected decoder and mixed proto-loader paths have substantial remaining
costs. Flat scalar specialization reduced the initial decoder regression, but
these final reports still do not establish performance parity. Native wire
primitives also affect pre-generated SDK messages, whose code is unchanged.
These synthetic operation timings are not end-to-end application performance
measurements. The package remains unreleased and unadopted.

The previous derived-runtime reports used a different implementation and harness;
they remain in repository history and are not used for current claims.
