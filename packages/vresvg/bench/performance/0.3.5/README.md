# Renderer performance — VLX 0.3.5

The owned renderer is substantially faster than the 0.3.4 release. Problem
pictures are closer to native speed; handwriting still has a roughly 2–3×
native-speed gap. No universal performance-parity claim is made.

These are fresh-process measurements of the unchanged application SVG composer
at `9e68efc4`, followed by rasterization and PNG encoding. Six trials per
implementation/case rotate all three implementations through balanced orders.
Two identical-current control pairs per case expose desktop variation. Workers
use default GC/heap settings, no warmup, and no simultaneous benchmark workers.
Module loading and synthetic input creation are outside timing; first renderer
compilation is inside. Peak RSS covers the entire worker, including imports and
input. Native resvg 2.6.2 receives the same SVG with font discovery disabled.
The previous implementation comes from the immutable `vlx-0.3.4` Git tag.

Synthetic handwriting reproduces the reported pen shapes, sample-midpoint curves,
script offsets, 1,200px width and 4,800px height cap. Both tidy and raw modes are
included at 8,500 glyphs. Problem inputs repeat the exact reported 65-character
phrase 150 and 400 times. Private caller files are read from Git into a temporary
directory, compiled unchanged, and removed. Only source hashes and synthetic
measurements are published; no student work or private source is included.

## Cold-call medians (milliseconds)

| Page | Node native | Node 0.3.4 | Node 0.3.5 | Bun native | Bun 0.3.4 | Bun 0.3.5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,200 glyphs, tidy | 148 | 818 | 307 | 83 | 532 | 172 |
| 4,300 glyphs, tidy | 502 | 3025 | 1032 | 266 | 1753 | 540 |
| 8,500 glyphs, tidy | 451 | 2472 | 1023 | 382 | 3854 | 885 |
| 8,500 glyphs, raw | 156 | 1424 | 477 | 144 | 1525 | 433 |
| 9,750-character problem | 248 | 806 | 310 | 234 | 627 | 257 |
| 26,000-character problem | 709 | 2443 | 854 | 643 | 1649 | 631 |

Node 24.22.1 and Bun 1.4.4, macOS arm64. These are descriptive medians, not
confidence intervals or deployed-function latency. The raw files retain every
sample, range, control pair, runtime and source hash. Desktop load produced
outliers, especially on handwriting; small native/current differences must not
be promoted to precise parity or speedup claims.

## Highest observed process RSS (MiB)

| Page | Node 0.3.4 → 0.3.5 | Bun 0.3.4 → 0.3.5 |
| --- | ---: | ---: |
| 1,200 glyphs, tidy | 158 → 124 | 79 → 82 |
| 4,300 glyphs, tidy | 338 → 274 | 176 → 193 |
| 8,500 glyphs, tidy | 431 → 293 | 190 → 200 |
| 8,500 glyphs, raw | 235 → 176 | 117 → 128 |
| 9,750-character problem | 153 → 136 | 152 → 116 |
| 26,000-character problem | 272 → 226 | 379 → 264 |

These peaks are observations, not hard bounds on the whole process. The scanner
imports one growable memory capped at 256 MiB per live surface. Typical pages use
far less; source/path arrays, runtime heaps, application SDKs and concurrent
requests consume additional memory. This does **not** certify a 256 MiB Cloud
Functions instance or a production concurrency setting. Production memory and
load have not been measured. Bun's memory tradeoffs differ from Node's; the table
reports increases as well as decreases.

## What changed and what stayed fixed

- Our 9.5 KB portable kernel, compiled from committed `src/scan.c`, performs
  nonzero scan conversion and lossless PNG filtering. It imports only memory;
  it contains no upstream renderer, libc or WASI code. The pinned compiler
  reproduces the binary with `node scripts/build-resvg-wasm.cjs --check --download`.
- Subrow edge membership and coherent intersection ordering reduce repeated
  sorting. Stable tie ordering and Float32 accumulation preserve reference pixels.
- Streaming path parsing and scalar curve subdivision avoid temporary arrays;
  transforms go directly into the edge buffer, and path caches account for arrays.
- PNG filtering uses at most 1 MiB of reusable scratch instead of another full-page
  buffer. Independent nonfinal deflate blocks form one valid zlib stream, with a
  final block and incremental Adler-32. Faster lossless compression trades size
  for latency: these PNGs are 9–15% larger on Node and 24–51% larger on Bun than
  0.3.4. Decoded pixels are identical; PNG byte identity was never the contract.
- Source, pixel, geometry and cumulative work limits remain unchanged. Dense
  adversarial input still rejects. The 26,000-character and exact 8,192-item
  problem pages preserve their RGBA hashes.

Node/Bun tests cover the JavaScript reference, clipped/coincident curves,
transparent figures, retained results, chunk boundaries, and the existing limit
failures. All 1,800 VLX drawings match 0.3.4's RGBA exactly. The unchanged app
writeup caller and 84 native pixel controls pass; its problem caller passes six
large synthetic pages on both runtimes with external services stubbed.

## Reproduction

```sh
OUTPUT=packages/vresvg/bench/performance/cold-node24.json node packages/vresvg/bench/app-cold.cjs /path/to/ventimath-private 9e68efc4
OUTPUT=packages/vresvg/bench/performance/cold-bun.json bun packages/vresvg/bench/app-cold.cjs /path/to/ventimath-private 9e68efc4
```

[Node raw trials](cold-node24.json) · [Bun raw trials](cold-bun.json)

The older `results/` records are **0.3.4 warm synthetic microbenchmarks** from
`bench/compare.cjs`, including the reported 87.8 ms Node / 83.1 ms Bun curved
page versus 11.6 ms native. They are historical evidence, not measurements of
this revision. The current cold-call workload more closely matches the reported
light production use and the larger application pages.
