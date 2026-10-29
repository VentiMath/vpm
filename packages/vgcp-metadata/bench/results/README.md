# Metadata benchmark evidence

Compared with gcp-metadata 9.2.3 on Node 24.22.1 and Bun 1.4.0, Apple M1 Pro,
macOS arm64. Three fresh processes and one identical-upstream control per runtime;
12 alternating paired rounds after warmup. Every sample is retained. Percentages
are medians of paired ratios, which can differ from ratios of pooled timing medians.

HTTP cases use a local server and each implementation's default transport:
VPM uses native fetch, upstream uses node-fetch 3 on Node and native fetch on Bun.
VPM also enforces a total request deadline, direct routing, response-byte bounds
and cancellation of losing requests. Stub cases return a prebuilt response with
Fetch Headers and isolate metadata preparation, decoding and request lifecycle.

Node HTTP JSON and text take 18.0% and 15.6% less paired time. Bun HTTP JSON and
text remain slower by 63.6% and 33.9%, or about 55 and 32 microseconds using pooled
medians. All three processes show the Bun regressions beyond control variation.
Those rows compare the complete paths, including VPM's bounds and lifecycle checks;
they do not isolate a single cause. Stub JSON/text handling is faster on both
runtimes, though the Bun JSON control varies by 9.0%.

Cached Node availability takes 296 → 936 ns (+217.1%): roughly 0.64 microseconds
for checking host, detection mode and retry settings before cache reuse. Bun's
cached availability difference is within control variation. Near-zero residency
measurements are JIT-sensitive and do not imply meaningful application gains.
These tests exclude cloud network latency and are not production throughput claims.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| cached residency | 6 | 6 | 0.1% | 0.3%, 0.1%, -0.0% | 0.1% |
| cached availability | 296 | 936 | 217.1% | 215.9%, 224.7%, 206.2% | -0.5% |
| assume-present detection | 485 | 300 | -38.3% | -37.2%, -39.7%, -38.1% | -0.4% |
| JSON accessor with stub transport | 2654 | 2358 | -12.4% | -11.9%, -12.6%, -13.3% | -0.6% |
| text accessor with stub transport | 2969 | 1593 | -46.5% | -47.1%, -43.8%, -47.5% | 1.8% |
| HTTP JSON metadata | 266242 | 225778 | -18.0% | -16.4%, -15.9%, -20.4% | -1.9% |
| HTTP text metadata | 184859 | 152107 | -15.6% | -15.6%, -15.3%, -16.0% | -3.9% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process changes | Upstream control |
| --- | ---: | ---: | ---: | --- | ---: |
| cached residency | 11 | 1 | -86.5% | -88.4%, -43.4%, -36.6% | -0.4% |
| cached availability | 70 | 67 | -1.9% | -2.6%, -2.3%, -1.5% | -3.2% |
| assume-present detection | 165 | 54 | -66.1% | -66.3%, -66.6%, -63.8% | 0.6% |
| JSON accessor with stub transport | 1663 | 1332 | -17.7% | -19.5%, -15.8%, -20.1% | 9.0% |
| text accessor with stub transport | 1209 | 713 | -39.6% | -38.2%, -39.5%, -39.7% | -5.5% |
| HTTP JSON metadata | 91589 | 146095 | 63.6% | 61.4%, 53.7%, 71.9% | 7.6% |
| HTTP text metadata | 90300 | 122726 | 33.9% | 32.8%, 33.9%, 35.5% | 1.0% |

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
