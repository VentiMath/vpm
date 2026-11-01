# vgoogle-gax measurements

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

Recorded 2026-11-01T14:59:33.301Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| path / construct | 1398 | 1488 | 6.1% | 6.6% | 6.1% | 5.2% | unestablished at this precision |
| path / construct and render | 2083 | 1940 | -6.3% | -6.3% | -5.6% | 34% | unestablished at this precision |
| path / repeated render | 687 | 365 | -47% | -46.4% | -47.5% | 4.8% | lower time in every pair, beyond control spread |
| path / repeated match | 982 | 206 | -78.9% | -79% | -78.8% | 3.1% | lower time in every pair, beyond control spread |
| path / compound match | 836 | 169 | -79.8% | -79.8% | -79.9% | 0.5% | lower time in every pair, beyond control spread |
| deadline / snapshot call options | 84 | 83 | -0.9% | 0.8% | -10.6% | 2.1% | unestablished at this precision |
| REST parser / one small message | 1954 | 1555 | -20.1% | -21.7% | -18.8% | 69.6% | unestablished at this precision |
| REST parser / 32 messages | 29175 | 24389 | -16.8% | -18.5% | -15.9% | 3.2% | lower time in every pair, beyond control spread |
| REST parser / fragmented 64KiB message | 965205 | 233823 | -75.7% | -77.5% | -75.2% | 34.7% | lower time in every pair, beyond control spread |
| proto cache / gRPC hit small schema | 2644 | 827 | -68.7% | -42.5% | -69.9% | 13.6% | lower time in every pair, beyond control spread |
| proto cache / gRPC refresh small schema | 13672 | 6586 | -50.7% | -51.1% | -50.7% | 31.4% | lower time in every pair, beyond control spread |
| proto cache / REST hit small schema | 2674 | 828 | -69% | -68.8% | -69% | 2.7% | lower time in every pair, beyond control spread |
| proto cache / REST refresh small schema | 9577 | 3944 | -58.8% | -53.6% | -58.8% | 5.8% | lower time in every pair, beyond control spread |
| proto cache / gRPC Firestore schema hit | 130416 | 130982 | 0.3% | 2.1% | -3% | 13.9% | unestablished at this precision |
| proto cache / gRPC Firestore schema refresh | 5738427 | 4427028 | -23.1% | -19.5% | -23.1% | 15.4% | unestablished at this precision |
| proto cache / REST Firestore schema hit | 133512 | 131028 | -0.2% | -3.2% | 37.3% | 15.8% | unestablished at this precision |
| proto cache / REST Firestore schema refresh | 2752510 | 2224233 | -18.3% | -10.4% | -30.3% | 2.4% | lower time in every pair, beyond control spread |
| Firestore SDK / unary document | 196841 | 239509 | 18.2% | 27.1% | 18.2% | 43.4% | unestablished at this precision |
| Firestore SDK / batch read stream | 249222 | 246159 | 1% | -12.7% | 6.4% | 64.7% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T15:01:05.624Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| path / construct | 1755 | 1438 | -17.7% | -18.1% | -12.1% | 7.1% | unestablished at this precision |
| path / construct and render | 2497 | 1823 | -27.4% | 72.9% | -27.5% | 1.6% | unestablished at this precision |
| path / repeated render | 632 | 226 | -64.4% | -61.3% | -64.4% | 26.5% | lower time in every pair, beyond control spread |
| path / repeated match | 958 | 115 | -88.3% | -88.4% | -87.4% | 49% | lower time in every pair, beyond control spread |
| path / compound match | 725 | 120 | -83.6% | -76.6% | -83.6% | 4.2% | lower time in every pair, beyond control spread |
| deadline / snapshot call options | 60 | 52 | -12.7% | -10.7% | -24.2% | 9.1% | lower time in every pair, beyond control spread |
| REST parser / one small message | 1626 | 1403 | -15.2% | -18.5% | -11.9% | 1.2% | lower time in every pair, beyond control spread |
| REST parser / 32 messages | 19769 | 15306 | -23.2% | -24.6% | -23.2% | 1.7% | lower time in every pair, beyond control spread |
| REST parser / fragmented 64KiB message | 957605 | 178373 | -80.5% | -81% | -66.9% | 4.9% | lower time in every pair, beyond control spread |
| proto cache / gRPC hit small schema | 1295 | 593 | -56.1% | -56.4% | -53.8% | 4.1% | lower time in every pair, beyond control spread |
| proto cache / gRPC refresh small schema | 7548 | 5032 | -31.8% | -31.8% | -33.3% | 10.9% | lower time in every pair, beyond control spread |
| proto cache / REST hit small schema | 1340 | 608 | -55.1% | -60% | -49.6% | 4.4% | lower time in every pair, beyond control spread |
| proto cache / REST refresh small schema | 4351 | 2166 | -50% | -53.3% | -48.9% | 5.5% | lower time in every pair, beyond control spread |
| proto cache / gRPC Firestore schema hit | 75484 | 73088 | -3.7% | -0.6% | -3.7% | 51.5% | unestablished at this precision |
| proto cache / gRPC Firestore schema refresh | 4353917 | 3348281 | -25.4% | -18.2% | -28.5% | 2.7% | lower time in every pair, beyond control spread |
| proto cache / REST Firestore schema hit | 71651 | 69780 | -4.3% | -21.6% | -0.4% | 8.8% | unestablished at this precision |
| proto cache / REST Firestore schema refresh | 1983096 | 1641445 | -12.6% | 154.3% | -12.6% | 8.8% | unestablished at this precision |
| Firestore SDK / unary document | 128313 | 148648 | 9.8% | 37.7% | 6.4% | 24.7% | unestablished at this precision |
| Firestore SDK / batch read stream | 142622 | 163659 | 14.8% | 42.1% | -0.2% | 6.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vgoogle-gax/bench/results/node-isolated.json node packages/vgoogle-gax/bench/compare.cjs
OUTPUT=packages/vgoogle-gax/bench/results/bun-isolated.json bun packages/vgoogle-gax/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vgoogle-gax
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
