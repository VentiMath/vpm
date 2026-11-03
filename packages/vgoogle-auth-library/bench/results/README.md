# vgoogle-auth-library measurements

Each timed
implementation runs alone in a fresh process. Four comparison pairs use
balanced upstream-first / VPM-first order; two further pairs run identical
upstream code in separate processes as controls. Warmup lasts at least 150 ms
per case, followed by recalibration on warmed code, four warmup blocks and 12
recorded blocks. Both workers in a pair use the same iteration count, targeting
10 ms blocks with a one-million-operation cap. Results are retained and checked
outside timing. All samples are kept, including outliers.

The comparison units are per-process medians. The change column is the median
of four process-pair percentage changes; the two order columns expose order
sensitivity. The nanosecond columns are medians of the four process medians.
They need not produce exactly the percentage in the change column.

A direction is unestablished when it reverses across processes or any pair
overlaps the largest absolute control difference (with a minimum 2% floor).
This is a conservative descriptive check, not a confidence interval. Process
isolation reduces shared JIT feedback; environmental noise and GC remain.
Negative changes mean less time; these are local workload measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-03T14:28:50.900Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| OAuth2 client creation | 1241 | 203 | -83.6% | -83% | -84.1% | 0.4% | lower time in every pair, beyond control spread |
| cached self-signed JWT headers | 343 | 382 | 12.3% | 11.9% | 12.3% | 3.3% | higher time in every pair, beyond control spread |
| self-signed JWT for new audiences | 871248 | 572609 | -33.8% | -34.6% | -33.5% | 2.8% | lower time in every pair, beyond control spread |
| cached OAuth2 request headers | 508 | 445 | -11.7% | -11.7% | -11.7% | 3.1% | lower time in every pair, beyond control spread |
| cached GoogleAuth project lookup | 45 | 45 | 1.5% | -1.3% | 1.5% | 3.2% | unestablished at this precision |
| forced JWT token exchange with stub transport | 866777 | 575910 | -33.4% | -32.9% | -33.4% | 1.7% | lower time in every pair, beyond control spread |
| RSA ID-token verification | 39644 | 21041 | -47.2% | -45.7% | -47.2% | 1.9% | lower time in every pair, beyond control spread |
| authenticated HTTP JSON request | 150367 | 119077 | -24.7% | -15.8% | -29.4% | 21.5% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-03T14:29:25.072Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| OAuth2 client creation | 892 | 191 | -78.9% | -79.2% | -77.7% | 1.9% | lower time in every pair, beyond control spread |
| cached self-signed JWT headers | 149 | 82 | -44.6% | -45.2% | -44.6% | 1.1% | lower time in every pair, beyond control spread |
| self-signed JWT for new audiences | 758801 | 652366 | -13.7% | -14.5% | -12.6% | 0.1% | lower time in every pair, beyond control spread |
| cached OAuth2 request headers | 376 | 362 | -2.5% | -1.7% | -2.5% | 2.7% | unestablished at this precision |
| cached GoogleAuth project lookup | 30 | 30 | 0.4% | 0.7% | 0% | 1.9% | unestablished at this precision |
| forced JWT token exchange with stub transport | 751731 | 655129 | -13.5% | -13.5% | -13.2% | 0.2% | lower time in every pair, beyond control spread |
| RSA ID-token verification | 21269 | 17008 | -19.2% | -19.7% | -19.2% | 5.1% | lower time in every pair, beyond control spread |
| authenticated HTTP JSON request | 81275 | 79947 | -1.6% | 2.7% | -4.2% | 31.2% | unestablished at this precision |

The signing and verification cases use one checked-in 2,048-bit RSA fixture key
in every process. Forced token exchange uses a stub transport, so it excludes
HTTP latency. The authenticated HTTP case uses a local server and cached tokens.
The old shared-process reports are superseded and retained in Git history.

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vgoogle-auth-library/bench/results/node-isolated.json node packages/vgoogle-auth-library/bench/compare.cjs
OUTPUT=packages/vgoogle-auth-library/bench/results/bun-isolated.json bun packages/vgoogle-auth-library/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vgoogle-auth-library results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
