# vjws benchmark results

Node 24.22.1 and Bun 1.4.0, macOS arm64. The raw reports record the CPU, complete
runtime versions, timestamps, source hashes and every sample. Three fresh-process
runs per runtime compare `jws` 4.0.1 + `jwa` 2.0.1 (upstream), upstream `jws` +
`vjwa` (bridge), and `vjws` + `vjwa` (VPM). An identical-upstream control per runtime
measures variation from the harness and runtime.

## Method

Twelve measured rounds use all six variant orders twice. A baseline pilot targets
10 ms blocks (16–100,000 sync operations; 1–100,000 async operations). Each variant
gets 128 sync or two async initial calls, followed by five full warmup blocks in
changing order. All outputs are validated before timing, retained during timing
and consumed afterward. No samples are trimmed. Runs execute sequentially.

Tables show pooled median microseconds per operation. Changes are the median of
36 within-round time ratios, so they need not equal the ratio of the displayed
medians. Negative means less elapsed time. The control compares identically
implemented upstream variants; it is a noise indicator, not a correction factor.
Control changes range from -8.0% to +2.1% on Node and -4.7% to +9.8% on Bun. Treat
small differences cautiously; the complete per-process changes are available
from the summary script.

Stable-header cases reuse a header; varying signing headers use a new numeric
key ID per call, and varying verification rotates 257 prebuilt headers, exceeding
both bounded header caches. Crypto cases without PEM in the name use KeyObjects
(except HMAC's string secret). PEM string verification has a warm `vjwa` public-key
cache; PEM Buffer cases include uncached import. Large payloads are ASCII, avoiding
the upstream binary corruption difference and giving both implementations the
same bytes. Stream timing includes creating the Readable source, collection and
signing; the key is a direct string. The original upstream large-stream collector
repeatedly copies its accumulated buffer; VPM copies chunks and concatenates once.

The bridge exposes inherited `vjwa` costs/gains. In particular, warm PEM gains
largely come from `vjwa`, while the uncached Node RSA-PSS gap also exists in the
bridge. `vjws` adds strict compact/header validation that upstream verification
does not perform. These measurements do not establish application throughput,
startup cost, memory consumption or behavior on other platforms.

## Node 24.22.1

| Workload | Upstream µs | Bridge µs | VPM µs | vs upstream | vs bridge | Control |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HS256 sign | 3.562 | 3.101 | 2.517 | -29.6% | -18.4% | -0.6% |
| HS256 verify | 2.866 | 2.366 | 2.504 | -12.6% | +4.9% | -1.0% |
| RS256 sign | 675.939 | 683.848 | 691.409 | +1.5% | +1.3% | +2.0% |
| RS256 verify | 23.227 | 22.457 | 23.064 | -0.2% | +2.5% | +1.0% |
| RS256 verify warm PEM | 44.335 | 22.143 | 22.914 | -48.0% | +3.1% | -0.0% |
| RS256 verify uncached PEM Buffer | 43.495 | 46.367 | 46.709 | +7.3% | +0.9% | +0.2% |
| PS256 sign | 691.926 | 687.452 | 674.372 | -2.9% | -1.3% | -1.4% |
| PS256 verify | 23.851 | 23.384 | 23.816 | -0.0% | +1.8% | +0.6% |
| PS256 verify warm PEM | 46.805 | 23.439 | 24.301 | -48.5% | +2.6% | -2.3% |
| PS256 verify uncached PEM Buffer | 46.129 | 64.501 | 65.087 | +40.5% | +0.5% | -0.8% |
| ES256 sign | 30.410 | 29.495 | 28.615 | -5.6% | -2.6% | +0.5% |
| ES256 verify | 70.731 | 72.226 | 72.104 | +2.5% | +0.5% | -0.0% |
| ES256 verify warm PEM | 87.993 | 70.725 | 71.460 | -18.7% | +0.5% | +0.5% |
| ES256 verify uncached PEM Buffer | 87.676 | 94.818 | 94.592 | +7.3% | -0.6% | +0.6% |
| decode JWT | 1.850 | 1.848 | 1.100 | -40.8% | -40.3% | +0.2% |
| isValid JWT | 0.652 | 0.652 | 0.353 | -45.6% | -45.6% | -0.8% |
| HS256 sign 64 KiB | 86.658 | 85.323 | 76.926 | -10.5% | -9.4% | -1.8% |
| HS256 verify 64 KiB | 58.649 | 58.214 | 76.316 | +29.6% | +31.1% | -1.1% |
| decode 64 KiB | 102.626 | 102.539 | 43.461 | -58.3% | -58.0% | +1.1% |
| HS256 sign varying header | 3.454 | 3.065 | 3.438 | -1.8% | +11.0% | -2.0% |
| HS256 verify varying header | 2.812 | 2.335 | 3.251 | +15.6% | +39.5% | +0.9% |
| stream sign one chunk | 10.022 | 9.358 | 11.302 | +11.9% | +21.1% | -1.3% |
| stream sign 256 KiB / 16 chunks | 793.234 | 759.434 | 395.820 | -43.1% | -39.8% | -8.0% |
| stream sign 256 KiB / 1024 chunks | 11638.146 | 11619.729 | 1924.771 | -83.6% | -83.1% | -1.0% |

## Bun 1.4.0

| Workload | Upstream µs | Bridge µs | VPM µs | vs upstream | vs bridge | Control |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HS256 sign | 2.892 | 2.290 | 1.617 | -43.0% | -25.8% | -3.9% |
| HS256 verify | 2.188 | 1.565 | 1.576 | -27.3% | +4.3% | +2.4% |
| RS256 sign | 716.516 | 709.581 | 707.643 | -1.4% | -0.2% | +0.6% |
| RS256 verify | 18.055 | 16.637 | 17.072 | -5.7% | +1.9% | -3.5% |
| RS256 verify warm PEM | 22.358 | 16.617 | 16.789 | -24.6% | +2.1% | +0.7% |
| RS256 verify uncached PEM Buffer | 22.264 | 21.866 | 22.472 | +0.9% | +2.8% | -0.1% |
| PS256 sign | 716.327 | 711.624 | 707.731 | -1.0% | -0.6% | +0.3% |
| PS256 verify | 18.538 | 17.139 | 17.439 | -5.7% | +1.6% | -1.2% |
| PS256 verify warm PEM | 23.290 | 17.143 | 17.334 | -25.8% | +1.4% | -0.1% |
| PS256 verify uncached PEM Buffer | 23.376 | 22.636 | 23.182 | -0.3% | +1.1% | +0.5% |
| ES256 sign | 25.392 | 23.314 | 22.303 | -11.9% | -3.9% | -0.5% |
| ES256 verify | 53.858 | 53.069 | 53.265 | -0.5% | +0.1% | +0.3% |
| ES256 verify warm PEM | 55.719 | 53.607 | 53.754 | -3.4% | +0.2% | +0.5% |
| ES256 verify uncached PEM Buffer | 55.497 | 55.529 | 55.301 | +0.0% | -0.3% | -0.7% |
| decode JWT | 1.604 | 1.567 | 0.733 | -54.0% | -51.3% | +9.8% |
| isValid JWT | 0.620 | 0.602 | 0.261 | -57.0% | -56.4% | -1.4% |
| HS256 sign 64 KiB | 114.899 | 114.871 | 76.495 | -32.9% | -33.2% | +1.3% |
| HS256 verify 64 KiB | 72.382 | 72.477 | 92.712 | +27.6% | +26.2% | -1.9% |
| decode 64 KiB | 125.158 | 128.741 | 46.994 | -63.8% | -63.0% | -0.4% |
| HS256 sign varying header | 3.016 | 2.534 | 2.159 | -29.2% | -16.4% | -0.8% |
| HS256 verify varying header | 2.252 | 1.626 | 2.288 | +3.1% | +42.7% | -1.8% |
| stream sign one chunk | 6.475 | 5.946 | 10.311 | +50.8% | +66.8% | +4.4% |
| stream sign 256 KiB / 16 chunks | 677.735 | 600.958 | 308.241 | -56.6% | -51.5% | -4.7% |
| stream sign 256 KiB / 1024 chunks | 8427.364 | 8190.146 | 509.709 | -94.0% | -93.9% | -0.6% |

## Remaining costs

- Strict 64 KiB verification costs about 30% more on Node and 28% on Bun
  (roughly 18–20 µs extra). Native base64url round trips retain canonical validation
  while avoiding the larger full-payload regex cost observed during development.
- Varying-header HMAC verification is about 16% slower on Node (0.44 µs); the Bun
  difference is small and inconsistent across processes. Repeated headers are
  faster on both runtimes, without caching payloads or signatures.
- A single tiny stream costs about 12% more on Node and 51% on Bun (about 1.3 and
  3.8 µs). Native readable/writable lifecycle handling, copied input and cleanup
  add overhead. Direct-value collectors are created lazily, and large/many-chunk
  streams remain substantially faster. Synchronous callers avoid this stream path.
- Uncached Node PEM Buffer verification is about 7% slower for RSA and EC and
  41% for RSA-PSS. The bridge shows these costs already occur in `vjwa`; the JWS
  wrapper contributes little additional time. Warm PEM and KeyObject workloads
  are reported separately. Small RSA/EC signing or verification differences should
  be read alongside their controls and per-process variation.

## Reproduction

From the repository root, run each command sequentially with `OUTPUT` set to a
fresh result path. Use three separate processes for each runtime, then a separate
`CALIBRATION=1` run for each. No CPU-heavy validation should run concurrently.

```sh
OUTPUT=packages/vjws/bench/results/node-1.json node packages/vjws/bench/compare.cjs
OUTPUT=packages/vjws/bench/results/bun-1.json bun packages/vjws/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vjws/bench/results/calibration-node.json node packages/vjws/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vjws/bench/results/calibration-bun.json bun packages/vjws/bench/compare.cjs
node packages/vjws/bench/summarize.cjs --verify-current
```

The summary requires all eight files, checks matching runtime/methodology/source
metadata, validates sample counts, and verifies hashes against the current timed
implementation and fixtures. It emits pooled medians, paired changes, bridge
comparisons, per-process changes and controls. Runtime dependencies are the real
pinned upstream sources retained in this package and `vjwa`'s test fixtures.
