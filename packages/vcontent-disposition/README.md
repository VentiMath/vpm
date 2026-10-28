# vcontent-disposition

Create, parse, and format Content-Disposition headers for downloads and multipart
fields. Zero runtime dependencies, Node.js 20+, CommonJS and native ES module
imports, and self-contained TypeScript declarations.

The consumer target is `content-disposition` **2.0.1**, used by Express **5.3.0**
for `res.download()` and `res.attachment()` through its declared `^2.0.1` range.
The newer **3.0.0** release is also
included in compatibility checks and benchmarks. Both upstream versions already
have zero runtime dependencies; this package makes no dependency-reduction claim.

```js
const { create, parse, format } = require('vcontent-disposition');
// ESM: import { create, parse, format } from 'vcontent-disposition';

create('report.pdf'); // attachment; filename=report.pdf
create('雪.txt', { fallback: 'report.txt' });
// attachment; filename=report.txt; filename*=UTF-8''%E9%9B%AA.txt
parse(create('雪.txt')).parameters.filename; // '雪.txt'
format({ type: 'inline', parameters: { filename: 'report (1).pdf' } });
// inline; filename="report (1).pdf"
```

## Improvements and compatibility

- Parsed parameter maps have a **direct null prototype**, eliminating the shared
  mutable ancestor present in upstream 2.0.1 and 3.0.0. A local mutation of that
  upstream ancestor can suppress a filename in later parses; a regression test
  reproduces this. This is an isolation fix, not evidence of a remote exploit.
- All five functions require primitive strings where documented. Invalid types,
  flags, fallback values, and parameter maps throw `TypeError` without implicit
  string conversion or echoing the supplied values in VPM's own error messages.
  Options and parameter values are read once. Exported methods are immutable.
- Formatting rejects case-insensitive duplicate parameter names. When a Unicode
  value needs automatic extended encoding, an explicit extended parameter takes
  precedence, including a differently cased name. Only own enumerable string
  keys participate; inherited properties cannot suppress a value.
- Malformed Latin-1 percent escapes return `undefined`, and already-extended
  names cannot acquire another `*` through automatic encoding. **Upstream 3.0.0
  already fixes these two 2.0.1 behaviors**; they are carried forward here.
- Header creation avoids intermediate parameter objects. ASCII extended encoding
  has a fast path, Latin-1 decoding copies spans, and quoted parsing avoids
  character-by-character string building for ordinary values and discarded
  duplicates. Performance varies by operation and runtime; see the measurements.

The five named functions follow the 2.x/3.x API. The old callable 0.x/1.x export
is not implemented. Unknown option keys are ignored. Options may be an object,
`null`, or `undefined`; arrays and other primitives are rejected. Ordinary valid
filename output remains compatible with both comparison versions.

## API

### `create(filename?, { type?, fallback? }?)`

Returns a header string. `type` defaults to `attachment` and must be a nonempty
HTTP token. A missing filename produces only the disposition type; an empty
string produces `filename=""`. A supplied fallback is validated even when the
filename is omitted.

`fallback` defaults to `true`, replacing each non-printable-ASCII UTF-16 code unit
with `?` when a fallback is needed. A string supplies an explicit printable-ASCII
fallback. `false` omits the fallback when extended encoding is needed; ordinary
ASCII filenames still use `filename`. Filenames containing a `%HH` sequence use
extended encoding to avoid ambiguity, except when an explicit fallback equals
the filename (the existing upstream override). Quotes and backslashes are escaped in
ordinary quoted values. Control characters in a filename are encoded in the
extended value and replaced in the automatic fallback, never emitted literally.

Path handling belongs to the caller: this function does not remove directories.
Express applies its own basename handling before calling it. Lone UTF-16
surrogates throw `URIError` during extended encoding, as in both upstream versions.

### `parse(header, { extended?, multipart? }?)`

Returns `{ type, parameters }`. Type and parameter names are lowercased; the
parameter map is mutable and has no prototype. The first occurrence of each name
wins, except a successfully decoded extended value takes precedence over its
ordinary counterpart regardless of their relative order. The raw `name*` value
is retained alongside decoded `name`.

`extended` defaults to `true`; `false` keeps only raw parameters. `multipart`
defaults to `false`. Both flags must be booleans when supplied.

Normal quoted values unescape backslash pairs. Multipart quoted values decode
`%22`, `%0D`, and `%0A` case-insensitively, retaining literal backslashes. Quoted
extended values are not decoded, matching upstream. The multipart option controls
quoting; it does not turn off extended decoding, which is controlled separately.

This is **lenient extraction**, not a strict header validator: invalid type/name
syntax is retained, incomplete parameters and unterminated quotes are discarded,
trailing text after a closed quote is skipped, and space/tab around separators
is ignored. Do not use it as a filename/path sanitizer.

### `format({ type, parameters? }, { extended?, multipart? }?)`

Requires a nonempty HTTP-token type and an optional object of string parameter
values. `null` parameters mean no parameters. Own enumerable string keys are
serialized in insertion order, retaining casing. Inputs are not mutated.

Normal mode emits tokens directly, quotes printable ASCII/Latin-1 values, and
uses extended UTF-8 encoding for other values. `extended: false` rejects values
that need extended encoding. An explicitly encoded `name*` takes precedence
when `name` needs automatic encoding. An ordinary ASCII fallback and its
extended counterpart can both be emitted. Duplicate names differing only by
case throw `TypeError`. Values that need encoding under a name already ending
in `*` also throw; already encoded values should be passed as strings.

`multipart: true` always quotes values and escapes CR, LF, and quotes as `%0D`,
`%0A`, and `%22`, preserving Unicode and backslashes. This follows the upstream
multipart mode, which is distinct from normal HTTP response-header formatting.

### `encodeExtended(value)` / `decodeExtended(value)`

Encoding returns `UTF-8''` followed by percent-encoded text, with the additional
escapes required for extended HTTP parameters. Lone surrogates throw `URIError`.
Decoding supports UTF-8 (including the existing `utf8` alias) and ISO-8859-1;
unsupported charsets, missing delimiters, invalid UTF-8, or malformed percent
escapes return `undefined`. Empty encoded strings decode to `''`.

Decoding deliberately preserves upstream's tolerance of raw spaces/non-ASCII
characters and ignores the language component. It is not full RFC syntax
validation. Returning `undefined` for broken encoded values lets parsing retain
a valid ordinary fallback. See [RFC 8187](https://www.rfc-editor.org/rfc/rfc8187.html)
for encoding and recovery rules, and
[RFC 6266](https://www.rfc-editor.org/rfc/rfc6266.html) for response headers.

## Validation

```sh
node --test packages/vcontent-disposition/test/*.test.cjs
bun test packages/vcontent-disposition/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

Seventeen tests cover both baselines, 15,000 generated parser cases against
3.0.0, all 256 byte values in encoding/Latin-1 decoding, malformed escapes,
quoted/multipart recovery, duplicate names, prototype isolation, input validation,
getter reads, long values, lone surrogates, and CJS/ESM exports. Fixture hashes
are verified. These are VPM tests, not a claim to run the full upstream suite.

The shared integration gate aliases this package into real Express alongside all
other VPM replacements. It checks download and attachment output for Unicode,
quotes, percent sequences, and control characters, plus HEAD/range requests and
download completion callbacks. The archive gate installs actual package archives
with npm and Bun, runs CJS/ESM consumers on Node and Bun, and compiles strict
TypeScript 7 consumers without ambient Node, Undici, or DOM declarations.
Current shared coverage is in the [central record](../../IMPROVEMENTS.md#the-integration-gate).

## Benchmarks

```sh
node packages/vcontent-disposition/bench/compare.cjs
bun packages/vcontent-disposition/bench/compare.cjs
node packages/vcontent-disposition/bench/compare.cjs latest
bun packages/vcontent-disposition/bench/compare.cjs latest
```

The harness checks output equality before timing, warms both implementations,
consumes the returned filenames/types, and alternates order over nine samples of
50,000 calls. `OUTPUT=/path/to/results.json` records every sample, source hashes,
and runtime details. `COUNT` changes the calls per sample. Results describe utility
calls, not end-to-end download throughput.

One sequential run on **2026-10-27**, Node **24.22.1** and Bun **1.4.0**
on macOS arm64. Medians in **nanoseconds per call**, upstream **2.0.1 → VPM**:

| Case | Node | Bun |
| --- | ---: | ---: |
| create ASCII | 155 → 83 | 99 → 50 |
| create quoted | 315 → 224 | 184 → 125 |
| create Unicode | 614 → 411 | 385 → 270 |
| create Unicode no fallback | 349 → 225 | 237 → 168 |
| parse type only | 49 → 58 | 36 → 36 |
| parse short filename | 152 → 175 | 189 → 195 |
| parse short quoted | 200 → 192 | 284 → 207 |
| parse extended | 556 → 585 | 509 → 522 |
| parse 4 KiB quoted | 20,345 → 381 | 23,787 → 482 |
| parse escaped quoted | 3,467 → 3,300 | 4,508 → 4,368 |
| parse duplicate 4 KiB | 20,360 → 482 | 23,467 → 595 |
| parse multipart | 299 → 362 | 396 → 423 |
| format ASCII | 107 → 99 | 65 → 70 |
| format quoted | 216 → 208 | 105 → 114 |
| format Unicode | 273 → 275 | 171 → 203 |
| format fallback pair | 182 → 233 | 104 → 151 |
| format multipart pair | 363 → 406 | 243 → 303 |
| encode ASCII | 122 → 33 | 75 → 27 |
| encode Unicode | 204 → 203 | 149 → 167 |
| decode Latin-1 short | 135 → 101 | 171 → 141 |
| decode Latin-1 sparse | 1,405 → 137 | 1,458 → 175 |
| decode UTF-8 | 271 → 272 | 147 → 144 |

Short unquoted filename parsing took 15% more time on Node. Formatting the fallback pair took 28% more on Node and 46% more on Bun. The tables retain these costs alongside the faster paths. Express calls `create`, which avoids the general formatter; the microbenchmarks do not establish a noticeable download-throughput improvement. Differences close to parity can vary between runs.

Against **3.0.0**, ratios are VPM time / upstream time; below 1 is faster:

| Case | Node | Bun |
| --- | ---: | ---: |
| create ASCII | 0.54 | 0.49 |
| create quoted | 0.72 | 0.67 |
| create Unicode | 0.67 | 0.66 |
| create Unicode no fallback | 0.65 | 0.59 |
| parse type only | 1.18 | 1.02 |
| parse short filename | 1.14 | 1.05 |
| parse short quoted | 0.94 | 0.75 |
| parse extended | 1.04 | 1.00 |
| parse 4 KiB quoted | 0.02 | 0.02 |
| parse escaped quoted | 0.94 | 0.98 |
| parse duplicate 4 KiB | 0.02 | 0.02 |
| parse multipart | 1.22 | 1.13 |
| format ASCII | 0.93 | 1.03 |
| format quoted | 0.96 | 1.08 |
| format Unicode | 0.87 | 1.19 |
| format fallback pair | 1.26 | 1.42 |
| format multipart pair | 1.10 | 1.25 |
| encode ASCII | 0.27 | 0.37 |
| encode Unicode | 1.00 | 1.11 |
| decode Latin-1 short | 0.74 | 0.78 |
| decode Latin-1 sparse | 0.10 | 0.13 |
| decode UTF-8 | 0.99 | 1.02 |

Function references are captured once before timing so the ESM baseline does not pay a namespace-property lookup on every call. All calls still consume their results. The long Latin-1 case has sparse escapes across roughly 240 characters; the short case uses a normal filename.

Recorded samples and source hashes: [Node / 2.0.1](bench/node24-v2.json), [Bun / 2.0.1](bench/bun14-v2.json), [Node / 3.0.0](bench/node24-v3.json), [Bun / 3.0.0](bench/bun14-v3.json).

## Installation and provenance

Available from this repository; a public registry publication is not claimed.
Build with `npm pack ./packages/vcontent-disposition` and install the resulting
archive using npm or Bun. The archive contains implementation, declarations,
README, license, provenance, and package metadata. Tests, fixtures, and benchmark
files are excluded. There are no runtime dependencies.

Derived from MIT-licensed `content-disposition` by Douglas Christopher Wilson.
[Provenance](PROVENANCE.json) records the exact 2.0.1 and 3.0.0 npm archive
integrities, upstream commits, and unchanged source-fixture hashes. Archive
integrities were checked against downloaded bytes. Upstream license notices are
preserved; fixtures are comparison material only. VPM's own implementation also
uses the span-scanning approach in its `vcontent-type` package.
