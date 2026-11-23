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
package dependency; Node's zlib provides compression and CRC. No resvg native
addon, platform binary or font discovery is used. The `internal-*` exports serve
VLX and are not a public SVG contract. VLX retains its own error type.

Limits bound source length (32 Mi characters), pixel area (16,777,216), dimensions
(16,384), nesting, flattened points, stroke geometry and sampling work. Raster
edges are antialiased; PNG bytes need not match native resvg. Tests compare
output dimensions and ink, not just whether rendering succeeds.

[Measurements](bench/README.md) · [Provenance](PROVENANCE.json)

Run `node --test packages/vresvg/test/*.test.cjs`, `bun test packages/vresvg/test`
and `node scripts/resvg-conformance/compare.cjs` from the repository root.
The pixel control uses the test-only resvg fixture in `scripts/vlx-conformance`.
No private source or student handwriting is included in this package.
