# vresvg

In-house SVG rasterization for VentiMath handwritten writeup pictures. The API
matches the app-used part of `@resvg/resvg-js` **2.6.2**:

```js
const { Resvg } = require('vresvg');
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
```

`fitTo` also supports `height` (the app caps tall pages at 4800 pixels), `zoom`
and `original`. Input is a string or UTF-8 byte array. Output exposes `width`,
`height` and `asPng()`. Repeated PNG reads cannot mutate a later result.

This is a deliberately bounded renderer for generated handwriting, **not full
SVG compatibility**. It supports `svg`, `g`, `rect`, absolute `M/L/H/V/Q/C/Z`
paths, a viewBox with matching viewport proportions, group paint inheritance,
hex/basic opaque colors, nonzero fills, and butt/round caps with miter/round joins.
Attributes use double quotes. CSS, fonts, filters, opacity, external images,
relative/arc paths and other unsupported drawing features throw explicitly.
Defaults and sizing preserve the unchanged `writeupPicture.ts` caller, including
rounded stroke endpoints, zero-length pen marks and fractional page dimensions.

The raster engine comes from VPM's own VLX implementation. It now lives here so
math pictures and handwriting share one implementation. `vpngjs` is the only
package dependency; Node's zlib provides compression and CRC. The hot scan
converter and PNG filters are written in `src/scan.c` and shipped
as portable `scan.wasm`, with no libc or WASI imports. `scripts/build-resvg-wasm.cjs`
reproduces the binary using checksum-pinned wasi-sdk 34. Only host memory is
imported, capped at 256 MiB per live surface and grown as needed; that is not a
total-process or concurrency bound. PNG filtering uses at most 1 MiB of reusable
scratch and emits one lossless zlib stream in bounded chunks, avoiding a second
full-page pixel buffer. The JavaScript reference remains available
when WebAssembly is disabled (`VPM_RASTER_JS=1` also selects it for tests).
No resvg native addon, platform binary or font discovery is used.
The `internal-*` exports serve
VLX and are not a public SVG contract. VLX retains its own error type.

Vertex boundaries are ordered once per path and merged with the fixed sample
rows. Stable intersection ties, Float32 accumulation and original work charges
are preserved. Unique handwriting paths bypass the reusable font caches, and
cached font-path keys own their storage instead of retaining complete SVG inputs.

Limits bound source length (32 Mi characters), pixel area (16,777,216), dimensions
(16,384), nesting, two million flattened points per live path, stroke geometry
and 300 million cumulative work units. Every path instance consumes work, even
when its geometry is cached or it has no visible paint. The per-path allocation
limit does not accumulate across independently drawn glyphs. Raster
edges are antialiased; PNG bytes need not match native resvg. Tests compare
output dimensions and ink, not just whether rendering succeeds.

[Measurements](bench/README.md) · [Provenance](PROVENANCE.json)

Run `node --test packages/vresvg/test/*.test.cjs`, `bun test packages/vresvg/test`
and `node scripts/resvg-conformance/compare.cjs` from the repository root.
The pixel control uses the test-only resvg fixture in `scripts/vlx-conformance`.
No private source or student handwriting is included in this package.

## VentiMath installation

Use the updated `vresvg` archive accompanying [VLX 0.3.6](https://github.com/VentiMath/vpm/releases/tag/vlx-0.3.6):

```text
https://github.com/VentiMath/vpm/releases/download/vlx-0.3.6/vresvg-2.6.2.tgz
```

Its package version identifies the upstream API baseline; the release URL
identifies this implementation revision. Update the VLX and direct `vresvg`
pins together. Remove upstream `@resvg/resvg-js` and use `import { Resvg } from
'vresvg'` for handwriting. No rendering-option change is needed. VLX 0.2.3 still
needs the broader native renderer, so make the Functions cutover atomic.
Application main `9e68efc4` already uses both 0.3.4 release pins and removes native
resvg. The 0.3.6 update preserves its decoded pixels and limits. It also preserves
0.3.5 PNG encoding, whose faster compression can produce larger files than 0.3.4. Application repinning and production
verification remain separate.
