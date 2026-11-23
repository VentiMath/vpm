# Renderer performance — VLX 0.3.6

The remaining handwriting cost comes from exact antialiasing of overlapping
curve/stroke polygons, path parsing and geometry construction. This revision
removes repeated row-boundary sorting and unnecessary retention of unique pen
paths. It does not reduce samples, simplify curves or change the pixel contract.
Handwriting calls improve by 21–26% on Node and 11–29% on Bun against 0.3.5.
Native remains about 1.7–1.9× faster on tidy pages and 2.3–2.5× on the raw-page
case. The native-speed gap is reduced, **not closed**.

## Cold-call medians (milliseconds)

| Page | Node native | Node 0.3.5 | Node 0.3.6 | Bun native | Bun 0.3.5 | Bun 0.3.6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,200 glyphs, tidy | 96 | 219 | 173 | 99 | 240 | 169 |
| 4,300 glyphs, tidy | 320 | 726 | 547 | 278 | 543 | 482 |
| 8,500 glyphs, tidy | 455 | 1074 | 799 | 387 | 818 | 717 |
| 8,500 glyphs, raw | 159 | 486 | 372 | 143 | 410 | 355 |
| 9,750-character problem | 248 | 307 | 290 | 240 | 250 | 231 |
| 26,000-character problem | 644 | 755 | 706 | 637 | 624 | 567 |

These are fresh-process measurements of the unchanged application SVG composer
at `9e68efc4`, followed by rasterization and PNG encoding. Six trials per
implementation/case rotate through balanced orders. Two identical-current
control pairs per case expose desktop variation. Node 24.22.1 and Bun 1.4.4 on
macOS arm64 use default GC/heap settings, no warmup and no simultaneous benchmark
workers. Module loading and input creation are outside timing; first renderer
compilation is inside. Native resvg 2.6.2 receives identical SVG with font
discovery disabled. The previous source is the immutable `vlx-0.3.5` tag.
Control-pair variation reaches 16% on Node and 8% on Bun; these are descriptive
medians, not confidence intervals or deployed-function latency.

Synthetic handwriting reproduces the reported pen shapes and sample-midpoint
curves, script offsets, 1,200px width and 4,800px height cap. Both tidy and raw
8,500-glyph pages are included. Problem inputs repeat the exact reported
65-character phrase 150 and 400 times. Private caller files are read from Git into
a temporary directory, compiled unchanged and removed. Only hashes and synthetic
measurements are published; no private source or student work is included.

## Highest observed process RSS (MiB)

| Page | Node 0.3.5 → 0.3.6 | Bun 0.3.5 → 0.3.6 |
| --- | ---: | ---: |
| 1,200 glyphs, tidy | 122 → 99 | 80 → 76 |
| 4,300 glyphs, tidy | 264 → 147 | 193 → 181 |
| 8,500 glyphs, tidy | 290 → 189 | 203 → 151 |
| 8,500 glyphs, raw | 177 → 122 | 127 → 118 |
| 9,750-character problem | 135 → 135 | 116 → 119 |
| 26,000-character problem | 227 → 227 | 264 → 265 |

Peak RSS includes each worker's imports and input, not just the pixel buffer.
The larger Node tidy pages drop from 264–290 MiB to 147–189 MiB. Bun's largest
tidy page drops from 203 MiB to 151 MiB; the problem cases are effectively
unchanged. Memory increases are reported as well as decreases.

## Repeated-request memory

Four isolated workers per runtime use ABBA (old/new/new/old) order. Each
composes and draws 12 alternating 8,500-glyph tidy pages and 26,000-character
problem pages, retaining the previous PNG while drawing the next attachment.
Pen offsets vary between requests; no explicit GC or heap flags are used.
All 48 page hashes per runtime match 0.3.5 exactly.

| Runtime | 0.3.5 peak RSS | 0.3.6 peak RSS |
| --- | ---: | ---: |
| Node 24 | 487 MiB | 434 MiB |
| Bun 1.4.4 | 568 MiB | 549 MiB |


These observations are not hard total-process bounds or deployment certification.
The renderer's Wasm memory stays capped at 256 MiB **per live surface**, grows on
demand and is normally much smaller. Source strings, JS geometry, runtime heaps,
application SDKs, retained results and overlapping requests add memory. No cloud
settings were inspected or changed; actual Functions headroom depends on those
settings and the complete application. A nominal 256 MiB instance cannot be
certified from these results.

## What changed and what stayed fixed

- Lower and upper vertex boundaries are sorted once, then merged with the same
  eight fixed subrows. Duplicate boundaries still incur the old work charges.
- Stationary edge records use a compact sort index; 16-byte intersection records
  replace 24-byte records and also serve as the next sample's active set. Scan
  scratch reserves 76 rather than 96 bytes per input vertex.
- Unique pen paths bypass reusable font caches. Cached font keys own their string
  storage so a short sliced key cannot keep a complete SVG input alive. Parsing
  avoids separator substrings and coordinate-rest arrays. Bounded circle-unit
  tables avoid repeating trigonometry without changing its results.
- Curve flattening, sample coordinates, stable intersection ties, Float32 coverage,
  blending and PNG encoding remain unchanged. The 0.3.5 compression-size tradeoff
  still applies; see the [previous measurements](performance/0.3.5/README.md).
- Source, dimensions, pixels, per-path geometry and cumulative work limits remain
  unchanged. Fixed-charge tests check the exact accepted boundary and rejection
  one work unit above it. Large/dense adversarial inputs still reject.

Node/Bun tests pass, including randomized/coincident/clipped curves, strict
handwriting, transparent figures and retained results. All 1,800 VLX drawings
match 0.3.5 RGBA exactly. The unchanged writeup caller passes 18 synthetic pages
and 84 native pixel controls; its problem caller passes six large pages,
including the reported 26,000-character and exact 8,192-item cases. The repeated
request control also compares every page's RGBA hash against 0.3.5.

## Reproduction

```sh
OUTPUT=packages/vresvg/bench/performance/cold-node24.json node packages/vresvg/bench/app-cold.cjs /path/to/ventimath-private 9e68efc4
OUTPUT=packages/vresvg/bench/performance/cold-bun.json bun packages/vresvg/bench/app-cold.cjs /path/to/ventimath-private 9e68efc4
OUTPUT=packages/vresvg/bench/performance/memory-node24.json node packages/vresvg/bench/app-cold.cjs /path/to/ventimath-private 9e68efc4 --memory
OUTPUT=packages/vresvg/bench/performance/memory-bun.json bun packages/vresvg/bench/app-cold.cjs /path/to/ventimath-private 9e68efc4 --memory
```

[Node trials](performance/cold-node24.json) · [Bun trials](performance/cold-bun.json) ·
[Node memory](performance/memory-node24.json) · [Bun memory](performance/memory-bun.json)

The older `results/` records are 0.3.4 warm synthetic microbenchmarks. They are
historical evidence, not measurements of this revision.
