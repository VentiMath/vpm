# Metadata benchmark evidence

These measurements predate the Gaxios 8/native-fetch upgrade and describe the
source hashes captured at commit `fd273e24`. They remain historical evidence;
current HTTP performance is recorded in the [vgaxios report](../../../vgaxios/bench/results/README.md).
Run the source-hash verification at that recorded revision, not against the
upgraded transport.

Node 24.22.1 and Bun 1.4.0 on Apple M1 Pro, macOS arm64. Three fresh processes
and one identical-upstream control per runtime; 12 alternating paired rounds
after warmup. Every sample is retained. Percentages are medians of paired ratios,
which can differ from ratios of pooled timing medians.

The HTTP cases use a local server, the actual gcp-metadata 6.1.1 consumer and each
implementation's default HTTP stack. On Bun, upstream gaxios's bare `node-fetch`
import resolves to Bun's built-in compatibility module. VPM uses vnode-fetch.
These HTTP results compare those complete installed paths. Stub-transport cases
exclude networking and isolate metadata validation, JSON/text decoding and request
lifecycle. Cached availability includes checking whether configuration changed.

| Case | Node upstream → VPM (ns) | Node change | Bun upstream → VPM (ns) | Bun change |
| --- | ---: | ---: | ---: | ---: |
| Cached residency | 7 → 7 | −2.2% | 12 → 2 | −86.6% |
| Cached availability | 352 → 1,111 | +215.1% | 86 → 79 | −5.9% |
| Assume-present detection | 576 → 355 | −38.3% | 196 → 63 | −66.5% |
| JSON accessor, stub transport | 2,536 → 2,647 | +4.8% | 2,092 → 1,464 | −26.4% |
| Text accessor, stub transport | 2,922 → 1,774 | −40.1% | 1,301 → 808 | −37.6% |
| HTTP JSON metadata | 136,368 → 138,724 | +5.5% | 91,566 → 116,890 | +22.0% |
| HTTP text metadata | 125,478 → 128,839 | +2.7% | 84,550 → 104,241 | +28.2% |

Node HTTP JSON process changes span −6.6% to +15.2%, with an +8.6%
identical-upstream control; text spans −0.6% to +15.9%, control +1.6%.
Those Node HTTP results do not establish a consistent improvement or slowdown.
Bun HTTP regressions are repeatable: JSON +19.1% to +41.4%, control +4.2%;
text +22.7% to +38.9%, control +12.2%. They include the different default
transport implementations described above and remain an optimization opportunity.

Cached Node availability pays about 0.76 microseconds to check configuration
before reusing a result. It is a real, repeatable tradeoff for invalidation on
host/detection/retry changes. Stubbed JSON calls retain +4.8% Node overhead for
request validation, deadlines and cancellation; text avoids throwing to recognize
ordinary strings. Bun's near-zero residency timing is JIT-sensitive and is not an
application performance claim. No benchmark includes cloud network latency.

Reports contain all samples, source hashes, runtime/CPU details and calibration
flags. Reproduce from the repository root:

```sh
for runtime in node bun; do
  for run in 1 2 3; do
    OUTPUT=packages/vgcp-metadata/bench/results/$runtime-$run.json $runtime packages/vgcp-metadata/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT=packages/vgcp-metadata/bench/results/$runtime-control.json $runtime packages/vgcp-metadata/bench/compare.cjs
done
node packages/vgcp-metadata/bench/summarize.cjs --verify-current
```
