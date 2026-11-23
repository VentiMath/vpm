# Minipass measurements

Recorded on Node 24.22.1 and Bun 1.4.4 against Minipass 7.1.3. Each implementation
runs in its own fresh process, with four balanced AB/BA pairs and identical-source
controls. Validation is outside the timed blocks. The samples include stream
construction, listeners and completion for the named workload; they do not
measure filesystem traversal or end-to-end app builds.

| Case | Node time change | Bun time change |
| --- | ---: | ---: |
| object queue 1000 | -59.7% | -41.9% |
| flowing object writes 1000 | -39.5% | 19.5% |
| buffer concat 128 chunks | -42.2% | -23.4% |
| UTF8 decoder 64 chunks | -13.1% | 4.6% (unestablished) |
| object collect 100 | -39.9% | -22% |
| object async iterator 100 | -28.1% | 2.3% (unestablished) |

All six Node workloads are lower in every measured pair beyond control spread.
On Bun, object buffering, byte concatenation and object collection are lower;
flowing object writes are about 20% slower (roughly 1.7 microseconds more per
1,000 writes by the reported medians). Decoder and async-iterator directions
are unestablished because the differences are within control spread. There is
no general throughput or whole-build speed claim.

The queue's head cursor avoids repeatedly shifting buffered objects. The
flowing path still uses independent event and pipe dispatch; its Bun overhead
is retained transparently rather than weakening ownership or completion rules.

[Node raw samples](node.json) and [Bun raw samples](bun.json) include the source
hashes, all process pairs, calibration and identical-source control results.

```sh
OUTPUT=packages/vminipass/bench/node.json node packages/vminipass/bench/compare.cjs
OUTPUT=packages/vminipass/bench/bun.json bun packages/vminipass/bench/compare.cjs
```
