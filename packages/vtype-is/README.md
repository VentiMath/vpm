# vtype-is

Match request Content-Type headers against extensions, media types, wildcards
and structured suffixes. Preserves the Express-compatible type-is 2.x API with
case-insensitive matching and explicit validation. CommonJS, native ESM
named/default imports and self-contained TypeScript declarations; Node 20+.

```js
const typeis = require('vtype-is');
typeis(request, ['json', 'urlencoded', 'multipart']);
typeis.is('Application/Problem+JSON; charset=utf-8', ['+json']);
// 'application/problem+json'
typeis.is('text/html', ['TEXT/HTML']); // 'TEXT/HTML'
typeis.match('application/*+json', 'application/problem+json'); // true
```

## Changes from type-is 2.1.0

- Match ASCII media names and patterns case-insensitively, including uppercase
  `MULTIPART` and `URLENCODED` shortcuts. Exact matches retain the caller's
  spelling; wildcard/suffix matches return the normalized actual media type.
- Validate both sides of `match()`. Invalid names such as `text/@bad` no longer
  match `*/*`; malformed input values return `false` without coercion.
- Check the original media span before lowercasing can turn Unicode `K` into
  ASCII `k`. Parameter text is not confused with the media name.
- Recognize Content-Length only when it is a decimal string. Empty strings,
  negative lengths, hex, exponents, arrays, numbers, null and line terminators
  no longer count as valid length indicators.
- Read own lowercase header fields, so inherited properties do not supply a
  Content-Type or indicate a request body. No caches retain mutable caller
  headers or pattern arrays. Exports are frozen.
- Avoid allocating split arrays for matching or copying variadic arguments.

The compatibility baseline is **type-is 2.1.0**, used by Express 5.3.0 and
body-parser 2.4.0 in the pinned consumer fixture. Upstream **3.x** introduces
an ESM class API with different return contracts; this package preserves the
API those Express consumers currently call. Comparisons do not claim defects
in 3.x. Case-insensitive media names follow
[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.3.1).

## API and boundaries

- `typeis(request, types?)`: `null` without a body indicator, `false` without a
  valid matching Content-Type, or the first matching string. `types` may be an
  array or variadic strings. Omitted or empty lists return the normalized media
  type. A request must have a headers object; invalid request shapes throw
  `TypeError`. Header names must be lowercase, as provided by Node HTTP/HTTP2.
- `is(value, types?)`: the same matching without the body check; invalid values
  return `false`. The older `is({ headers }, types)` overload is retained.
- `hasBody(request)`: a defined own Transfer-Encoding header, or a decimal
  Content-Length string, including `"0"`. This preserves an indicator contract:
  it does not mean bytes are available. Transfer-Encoding remains a presence
  check; the HTTP server owns message framing and duplicate-header validation.
- `normalize(value)`: expand extensions using vmime-types; `urlencoded` becomes
  `application/x-www-form-urlencoded`, `multipart` becomes `multipart/*`, and
  `+json` becomes `*/*+json`. Explicit slash-containing patterns are returned
  with their spelling preserved; validation occurs during matching.
- `match(expected, actual)`: boolean matching of bare media names, with `*` as
  the whole type/subtype or `*+suffix` in the expected subtype. It does not strip
  parameters or whitespace and does not accept extensions as patterns.

Content-Type parameters are skipped using vcontent-type's type-only parser;
their syntax is not validated here. vmedia-typer defines the accepted bare-name
grammar and length limits. Unsupported name syntax returns `false`. Invalid
non-string entries in a pattern list are skipped. These validation changes are
intentional compatibility differences for malformed or synthetic inputs.

Three direct runtime dependencies: **vcontent-type**, **vmedia-typer**, and
**vmime-types**. The complete external tree adds only **vmime-db**. Dependency
counts match the upstream baseline; every dependency now has a VPM counterpart.

## Validation and performance

```sh
node --test packages/vtype-is/test/*.test.cjs
bun test packages/vtype-is/test
node packages/vtype-is/bench/compare.cjs
bun packages/vtype-is/bench/compare.cjs
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

Thirteen tests cover a header/pattern differential matrix, 20,000 generated
matches, exact/wildcard/suffix return contracts, casing, body indicators,
inherited headers, malformed input, caller mutation and CJS/ESM exports.
Type checks include real Node HTTP and HTTP/2 request shapes. The shared gate
passes 96 HTTP checks with all VPM replacements together, including Express
`req.is()`, framework JSON/form parsers and a direct Express app with uppercase
and structured-suffix parser patterns. Archive tests install the complete VPM
dependency tree through npm and Bun and check both runtimes and TypeScript 7.

Sequential local measurements on Node 24.22.1 and Bun 1.4.0, 2026-10-26.
Median nanoseconds/call, seven alternating 50,000-call samples after warmup,
with equivalent results checked. The baseline uses unchanged pinned upstream
code and dependencies, including the same MIME database snapshot.

| Case | Node: upstream → VPM | Bun: upstream → VPM |
| --- | ---: | ---: |
| Extension matching | 489 → 374 | 527 → 289 |
| Exact matching | 303 → 342 | 322 → 265 |
| Wildcard matching | 213 → 217 | 200 → 148 |
| Suffix matching | 378 → 309 | 484 → 240 |
| Unmatched types | 484 → 394 | 490 → 261 |
| Invalid media type | 119 → 136 | 142 → 71 |
| Request matching | 415 → 414 | 470 → 284 |
| Body indicator | 18 → 41 | 17 → 21 |
| Standalone match | 85 → 128 | 41 → 57 |

Several common matching cases improve, particularly on Bun. Added validation
costs time: standalone `match()` takes 40–51% longer, and body detection takes
24–134% longer in this run. Node exact and invalid matching also take 13–15%
longer. These microbenchmarks do not establish an application speedup.

## Installation and provenance

Available from this repository; no public registry release is claimed. Use
`bun pm pack --ignore-scripts` in this package and its four dependency package
directories, then install the five archives together with npm or Bun. Packing
rewrites workspace dependencies to their package versions. The automated
archive gate demonstrates this independent of workspace symlinks.
For Bun, also put the same `file:/absolute/path/package.tgz` mappings in the
consumer's `overrides` field: Bun otherwise tries to resolve the transitive
version requests from the public registry, where these packages are unpublished.

Derived from MIT-licensed type-is by Jonathan Ong and Douglas Christopher Wilson,
[2.1.0 commit 62a423f](https://github.com/jshttp/type-is/tree/62a423ff2144dcc0c047111be1c860a3027bf148).
The unchanged npm source, license, source digest and npm integrity are retained
under `test/fixtures`. Test-only loading supplies pinned content-type 2.1.0,
media-typer 1.1.1, mime-types 3.0.2 and mime-db 1.54.0 fixtures. Tests and
benchmarks are excluded from archives; this is not the complete upstream suite.
