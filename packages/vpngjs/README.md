# vpngjs

Independent implementation of the **pngjs 7.0.0 synchronous reader** used by
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

This is the application's reader contract, not the entire pngjs API. There is no
streaming constructor, writer, bitblt, gamma-adjustment API or `skipRescale` option.
Unknown options fail explicitly. The reader callers use the supported API; the
historical-contest importer test also constructs and writes fixture PNGs, which
requires a separate writer.

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

`vpngjs` is a public standalone server/tooling package, not an internal-only
`vresvg` module. A sibling release archive can be installed directly; it does not
require VLX or vresvg. The reader is published in
[VLX 0.3.6](https://github.com/VentiMath/vpm/releases/tag/vlx-0.3.6):

```json
{
  "dependencies": {
    "vpngjs": "https://github.com/VentiMath/vpm/releases/download/vlx-0.3.6/vpngjs-7.0.0.tgz"
  },
  "devDependencies": {
    "pngjs-fixtures": "npm:pngjs@7.0.0"
  }
}
```

Reader callers import `{PNG}` from `vpngjs`. A test that needs `new PNG` or
`PNG.sync.write` can import `{PNG as FixturePNG}` from the separately named
`pngjs-fixtures` dev dependency. Keeping upstream `pngjs` under its existing name
for that test also works. Do not globally override `pngjs` while a caller still
needs its constructor or writer. The reader's public types expose decoded pixels
as `Uint8Array`; code requiring Buffer-specific methods should convert explicitly.

Preserve each caller's accepted bounds when migrating. For example, VentiMath's
historical-contest importer admits 32,000,000 pixels and 16 MiB, so its read should
use `{checkCRC: true, maxPixels: 32_000_000, maxBytes: 16 * 1024 * 1024}` rather
than silently narrowing those limits to this package's defaults. Its Math Is Cool
importer's 8,000,000-pixel limit and bounded data URL fit the reader defaults.
Structural and CRC validation remain stricter than upstream as described above.

The VLX 0.3.6 archive was checked against its published SHA256SUMS and source
runtime bytes. A direct URL install and frozen reinstall, CJS/ESM reading, and
coexistence with the separately named upstream fixture writer pass on Node 24
and Bun 1.4.4. This package is consumed transitively by VLX/vresvg; direct adoption
by additional app callers is separate. No streaming or writer support is implied.
