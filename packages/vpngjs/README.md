# vpngjs

Independent implementation of the **pngjs 7.0.0 synchronous reader and RGBA8 fixture writer** used by
VentiMath to validate PNG figures and inspect rendered pixels. There are no
third-party runtime dependencies. Node 24 and Bun provide zlib inflation and CRC32.

```js
import {PNG} from 'vpngjs';
const image = PNG.sync.read(bytes, {checkCRC: true});
// image.width, image.height, image.data: owned RGBA8 bytes
```

The reader supports every legal static PNG color/depth combination, all five
filters, Adam7 interlacing, palettes, transparency keys and gamma metadata.
It preserves upstream's RGBA8 normalization and metadata, including transparent
black for transparency-key matches. The runtime pixel buffer is a Node Buffer;
public types expose the Uint8Array operations used by the application. APNG's
default image can be read; animation frames are not decoded.

`new PNG({width, height})` creates an owned, zero-filled RGBA8 Buffer. The
historical-contest fixture can now use the same constructor and synchronous
writer as its upstream caller:

```js
const fixture = new PNG({width: 4, height: 3});
fixture.data.fill(255);
const bytes = PNG.sync.write(fixture);
```

The writer accepts `{width, height, data, gamma?}` or a constructed/read image.
It produces non-interlaced RGBA8 with optional gamma metadata and correct chunk
CRCs, preserving every pixel, including RGB bytes under transparent alpha.
Decoded grayscale, palette, 16-bit and interlaced images can be written using
the reader's normalized RGBA8 buffer. It does not mutate or retain input data.
Compressed bytes and file sizes can differ from pngjs; decoded pixels agree.

This is the application contract, not the entire pngjs API. The constructor is
not a stream. There is no async parser, `pack`, `bitblt`, gamma-adjustment API or
`skipRescale` option. Writing other color types/depths, custom filters or deflate
settings is outside scope; unknown constructor/writer options fail explicitly.

## Validation and limits

- CRC checks include ignored ancillary chunks; upstream skips those checks.
- Duplicate headers, missing image data, discontinuous image chunks and trailing
  file data are rejected. Upstream accepts duplicate headers and can
  accept a file with no IDAT, depending on its private inflate path.
- Complete zlib streams and exact scanline lengths are required. Upstream's
  synchronous path can accept a truncated zlib checksum.
- Unused IDAT padding is tolerated, and unused transparency-key bits are masked,
  as required by the PNG decoder contract.
- Default bounds are **16,000,000 pixels** and **10 MiB input**, matching the original
  figure-validation limits. `maxPixels` and `maxBytes` can explicitly override them. Dimensions
  are checked before bitmap allocation; inflate is bounded to the exact expected
  bytes for all passes, including Adam7. Buffers also have an internal size bound.

Construction accepts `maxPixels`, defaulting to 16,000,000. Writing accepts
`maxPixels` and `maxBytes` with the same defaults as reading. Dimensions and
exact RGBA8 byte length are checked before scanline allocation; compressed output
is bounded during deflate and again after chunk assembly. Positive integer
width/height are required. A caller raising construction limits must also pass
its intended limits when writing.

`checkCRC: false` disables PNG chunk CRC checks only; structure, zlib integrity
and resource bounds still apply. Decoding never mutates input or shares writable
output across reads. Limits are intentional differences from upstream's broader,
unbounded reader. This package validates the decoded image structure, not every
optional ancillary metadata schema, and does not perform color management.

## Evidence

Node 24/Bun controls compare **162 valid corpus images** byte-for-byte and
metadata-for-metadata, require rejection of 14 invalid images, and exercise
additional malformed streams, limits, ownership and 192 upstream-encoded images.
The missing-IDAT corpus case requires VPM rejection without depending on upstream's
unstable accept/reject behavior; other invalid corpus cases have original controls.
Real resvg output is compared too. The app's unchanged **28 problemImage tests**
pass with either decoder at app commit `0f2ef94b` (Bun); private sources stay out
of this repository. This is local caller evidence, not an application cutover.

Clean npm/Bun archives verify CJS/ESM and TypeScript 7 NodeNext/Bundler consumers.
[Measurements](bench/results/README.md) use isolated processes and identical-source
controls. Small RGBA, interlaced 16-bit RGB and 960×480 resvg output decode in
17.7–26.0% less time on Node and 9.5–42.4% less on Bun. Indexed transparency is
inconclusive on both runtimes; no measured case establishes a regression. [Provenance](PROVENANCE.json) records source hashes and the
[PNG specification](https://www.w3.org/TR/png-3/) used for the independent design.

## Direct application use

`vpngjs` is a public standalone Node 24/Bun server/tooling package with no
runtime dependencies. The standalone `pngjs-7.0.0` release supports the existing
application import name:

```json
{
  "dependencies": {
    "pngjs": "https://github.com/VentiMath/vpm/releases/download/pngjs-7.0.0/vpngjs-7.0.0.tgz"
  }
}
```

The same URL can be installed under `vpngjs` if callers already import that name.
The release's `consumer-package.json` also provides a `pngjs` override for a graph
whose consumers are all within the documented synchronous contract. Existing
reader imports and the constructor/write fixture no longer require npm pngjs or
its `@types/pngjs` declarations. The older VLX/resvg sibling archives remain
reader-only and are not overwritten by this release.

Preserve each caller's accepted bounds when migrating. VentiMath's historical
importer permits 32,000,000 pixels and 16 MiB, so its read should use
`{checkCRC: true, maxPixels: 32_000_000, maxBytes: 16 * 1024 * 1024}`. The Math Is
Cool importer's 8,000,000-pixel bound and bounded data URL fit the defaults.
Public types expose bytes as `Uint8Array`; runtime pixel and encoded outputs are
Buffers. Convert explicitly when a typed caller needs Buffer-specific methods.

Fresh/frozen npm and Bun installs verify both names, CJS/ESM, TypeScript 7,
constructor/writer controls and exact archive contents. The unchanged historical
importer fixture at app `fa274faf` passes with both upstream and VPM; the private
sources are exported temporarily, never committed. Writer controls cover 192
mixed images and round trips through all 162 valid reader corpus images. See
[writer measurements](bench/write/README.md) and
[conformance](../../scripts/png-conformance/README.md). Publication and application
adoption remain separate.
