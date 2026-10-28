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
- Single-parameter formatting returns directly; two-parameter formatting uses
  local values instead of a scratch array and set. Standard type/name literals take exact-match validation paths;
  other names still use the complete token grammar. Case-insensitive duplicate
  checks, own-property filtering, and single-read snapshots remain in place.
- Header creation avoids intermediate parameter objects. ASCII extended encoding
  has a fast path, Latin-1 decoding copies spans, and quoted parsing avoids
  character-by-character string building for ordinary values and discarded
  duplicates. Formatting skips replacements when nothing needs escaping and
  copies multipart escape spans directly. Performance varies by operation and runtime; see the measurements.
- Parsing reuses literal keys for standard lowercase parameter names. Very short
  multipart fields decode while locating the closing quote; larger fields retain
  native span searches. Result maps remain independent and have null prototypes.

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

Twenty-one tests cover both upstream baselines, 15,000 generated parser cases against
3.0.0, all 256 byte values in encoding/Latin-1 decoding, malformed escapes,
quoted/multipart recovery, duplicate names, prototype isolation, input validation,
getter reads, long values, lone surrogates, and CJS/ESM exports. Fixture hashes
are verified. The performance follow-up adds 1,134 standard/custom-name parsing
cases, 5,000 generated formatting comparisons with the previous VPM commit, and
accessor/duplicate tests for one, two, and many parameters. These are VPM tests,
not a claim to run the full upstream suite. The multipart follow-up adds 2,496
comparisons around scan boundaries, malformed and incomplete escapes, unfinished
fields, duplicate names, Unicode, and ordinary versus multipart parsing.

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
node packages/vcontent-disposition/bench/compare.cjs previous
bun packages/vcontent-disposition/bench/compare.cjs previous
node packages/vcontent-disposition/bench/multipart.cjs
bun packages/vcontent-disposition/bench/multipart.cjs
```

The harness checks output equality before timing, warms both implementations,
consumes returned values, and alternates order over nine samples of
50,000 calls. `OUTPUT=/path/to/results.json` records every sample, source hashes,
and runtime details. `COUNT` changes the calls per sample. Results describe utility
calls, not end-to-end download throughput. The current harness first exercises
all input shapes for 5,000 calls each, then warms each case for 20,000 calls before
timing. This avoids measuring the first transition from a type-only parser to
parameter parsing during runtime optimization. Custom names, mixed casing and
larger parameter maps are included alongside the standard download fields.

### Multipart parsing follow-up

The remaining short multipart cost came from fresh sliced strings used as map
keys and a separate quote search, value copy, and percent-escape scan. The parser
now reuses literal `name`, `filename`, and `filename*` keys after exact matching.
When fewer than 32 code units remain in the header, it can decode a quoted
multipart field while locating its closing quote. Longer fields keep the span
scanner, and discarded duplicates skip decoding. The small bound avoids
character-by-character construction of medium and long values.

Validation, option getter reads, first-value behavior, extended-value precedence,
and malformed-input recovery are unchanged. An unfinished quoted field is still
discarded. Every result retains a fresh null-prototype map; no shared prototype
or parsed-result cache was introduced.

Recorded on **2026-10-27**, Node **24.22.1** and Bun **1.4.0**, macOS arm64.
Three fresh processes per runtime compare the exact `2097f39` implementation,
upstream 2.0.1, upstream 3.0.0, and current VPM in the same process. Each case
uses nine samples with rotating implementation order; results are consumed and
outputs checked before timing. Samples use 50,000 calls for short headers and
5,000 for headers over 500 code units. All cases warm for 5,000 calls before
timing any case, then each case warms for up to 20,000 calls per implementation.

The table gives the median of three process medians in nanoseconds per call;
ratios are medians of the three paired ratios against upstream 3.0.0.

| Multipart case | Node previous → now | Node / upstream 3 | Bun previous → now | Bun / upstream 3 |
| --- | ---: | ---: | ---: | ---: |
| plain fields | 310 → 304 | 0.91 | 480 → 192 | 0.49 |
| short escapes | 424 → 322 | 0.92 | 628 → 197 | 0.49 |
| lowercase escapes | 424 → 323 | 0.92 | 552 → 199 | 0.50 |
| unknown escapes | 354 → 356 | 0.93 | 588 → 228 | 0.51 |
| mixed-case names | 446 → 408 | 1.16 | 800 → 423 | 1.01 |
| unterminated field | 270 → 310 | 1.04 | 360 → 199 | 0.54 |
| 31-character suffix | 419 → 414 | 0.94 | 660 → 281 | 0.54 |
| 32-character suffix | 422 → 370 | 0.84 | 699 → 287 | 0.53 |
| 127-character suffix | 426 → 376 | 0.39 | 698 → 296 | 0.24 |
| 128-character suffix | 425 → 374 | 0.38 | 581 → 294 | 0.24 |
| dense escapes | 6,658 → 6,642 | 2.29 | 7,433 → 5,866 | 2.04 |
| 8 KiB sparse escapes | 814 → 764 | 0.02 | 977 → 731 | 0.02 |
| 8 KiB plain | 746 → 696 | 0.02 | 868 → 631 | 0.01 |
| discarded duplicate | 617 → 385 | 0.12 | 690 → 300 | 0.11 |

The original short escaped multipart case takes **24–25% less time
on Node than the prior VPM implementation**, and **6–7% / 7–8% less
than upstream 2.0.1 / 3.0.0** in these three runs. Bun takes
**67–69% less than prior VPM**. The separate whole-API comparison
also includes the same multipart case and retains the earlier formatting gains.

This is not a claim that every multipart header is faster. Mixed-case names and
long, densely escaped values remain slower than upstream; unfinished short
quoted fields can cost more than prior VPM because the scanner decodes before
finding that the closing quote is absent. Long plain/sparsely escaped values
retain their span-scanning gains. No application-throughput gain is claimed.

Raw results include every sample and hashes for all four implementations and the harness: Node [run 1](bench/multipart-node24-1.json), [run 2](bench/multipart-node24-2.json), [run 3](bench/multipart-node24-3.json); Bun [run 1](bench/multipart-bun14-1.json), [run 2](bench/multipart-bun14-2.json), [run 3](bench/multipart-bun14-3.json).

The exact [prior VPM source](test/fixtures/vcontent-disposition-2097f39.cjs) is retained and hash-checked by the tests. Separate whole-API runs: [Node](bench/multipart-overall-node24.json), [Bun](bench/multipart-overall-bun14.json).

### Performance follow-up

These historical measurements describe commit `2097f39`. The multipart follow-up
above supersedes its parser measurements; the formatting implementation remains
the same.

The first implementation allocated a values array and a set for every multi-field
format, repeatedly used the general validation/case-folding paths for standard
field names, and ran string replacements even when no escaping was necessary.
Those costs are conspicuous when the operation itself takes hundreds of
nanoseconds. Parsing also pays for independent null-prototype maps, which remain
part of the public contract.

The follow-up removes the avoidable allocations for two fields, returns directly
for a single field, validates
standard literals by exact comparison, avoids no-op replacements, copies multipart
escapes in spans, and keeps no-parameter parsing outside the parameter scanner.
It skips the first duplicate lookup because the map is known to be empty,
and reads each character once when locating the end of an escaped quoted value. It
keeps every validation, duplicate rule, malformed-input recovery rule, and fresh
result dictionary. No parsed results are cached or shared.

Recorded on **2026-10-27**, Node **24.22.1** and Bun **1.4.0**, macOS arm64.
The before/after comparison uses **three fresh processes per runtime**, with
nine alternating-order samples of 50,000 calls in each process. The table shows
the median of the three process medians, in nanoseconds per call. Ratio columns
come from separate paired comparisons with upstream **2.0.1**; below 1 is faster.

| Case | Node previous → now | Bun previous → now | Node / upstream | Bun / upstream |
| --- | ---: | ---: | ---: | ---: |
| create ASCII | 96 → 77 | 54 → 53 | 0.46 | 0.48 |
| create quoted | 243 → 189 | 125 → 130 | 0.57 | 0.66 |
| create Unicode | 437 → 314 | 271 → 250 | 0.49 | 0.62 |
| create Unicode no fallback | 233 → 177 | 156 → 141 | 0.48 | 0.61 |
| parse type only | 64 → 56 | 44 → 38 | 1.00 | 0.76 |
| parse short filename | 175 → 164 | 191 → 123 | 1.00 | 0.63 |
| parse short quoted | 189 → 178 | 208 → 141 | 0.86 | 0.53 |
| parse extended | 580 → 567 | 487 → 367 | 0.97 | 0.81 |
| parse 4 KiB quoted | 383 → 377 | 479 → 380 | 0.02 | 0.02 |
| parse escaped quoted | 3,345 → 3,549 | 3,954 → 3,623 | 1.05 | 1.03 |
| parse duplicate 4 KiB | 475 → 450 | 590 → 434 | 0.02 | 0.02 |
| parse multipart | 378 → 378 | 412 → 293 | 1.21 | 0.79 |
| format ASCII | 105 → 72 | 64 → 52 | 0.61 | 0.88 |
| format quoted | 217 → 116 | 107 → 79 | 0.51 | 0.72 |
| format Unicode | 281 → 205 | 190 → 137 | 0.72 | 0.83 |
| format fallback pair | 238 → 131 | 152 → 76 | 0.64 | 0.69 |
| format multipart pair | 413 → 182 | 296 → 101 | 0.48 | 0.34 |
| encode ASCII | 33 → 33 | 23 → 24 | 0.27 | 0.30 |
| encode Unicode | 212 → 178 | 162 → 149 | 0.84 | 1.05 |
| decode Latin-1 short | 103 → 103 | 134 → 130 | 0.76 | 0.77 |
| decode Latin-1 sparse | 141 → 142 | 168 → 170 | 0.10 | 0.11 |
| decode UTF-8 | 276 → 276 | 148 → 150 | 1.00 | 0.96 |
| parse mixed-case | 174 → 180 | 208 → 218 | 1.10 | 1.03 |
| parse custom field | 165 → 161 | 210 → 207 | 1.05 | 1.06 |
| format custom pair | 228 → 194 | 147 → 118 | 1.06 | 1.12 |
| format many fields | 648 → 495 | 405 → 370 | 0.96 | 1.51 |

The standard single-/two-parameter formatting regressions are removed in these
runs. Short unquoted Node parsing is near parity with both upstream 2.0.1
and 3.0.0. **Not every parser case is faster:** Node
multipart parsing takes 21% more time versus 2.0.1 and
22% more time versus 3.0.0. Escaped quoted parsing versus the prior VPM
implementation takes 6% more time on Node and
9% less time on Bun. Mixed-case/custom-field cases and larger Bun formatting
maps also retain overhead. Correctness guarantees remain; validation has not
been weakened and result maps are not shared. Long unescaped quoted-value parsing
remains much faster than either upstream version. These are utility-call
measurements, not an application throughput claim.

The exact prior implementation is [retained as a fixture](test/fixtures/vcontent-disposition-bf6666b.cjs) and hash-checked by the tests.
Recorded comparisons against that fixture: Node [run 1](bench/optimized-node24-previous-1.json), [run 2](bench/optimized-node24-previous-2.json), [run 3](bench/optimized-node24-previous-3.json); Bun [run 1](bench/optimized-bun14-previous-1.json), [run 2](bench/optimized-bun14-previous-2.json), [run 3](bench/optimized-bun14-previous-3.json).

Separate current-upstream comparisons retain every sample and source hash: [Node / 2.0.1](bench/optimized-node24-v2.json), [Bun / 2.0.1](bench/optimized-bun14-v2.json), [Node / 3.0.0](bench/optimized-node24-v3.json), [Bun / 3.0.0](bench/optimized-bun14-v3.json).

### Initial implementation measurements

These historical tables describe commit `bf6666b`, with per-case warm-up only.
They are retained with their original source hashes; the follow-up above is the
first performance follow-up; the multipart section above describes the current parser.

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

In that initial implementation, short unquoted filename parsing took 15% more time on Node. Formatting the fallback pair took 28% more on Node and 46% more on Bun. The tables retain these costs alongside the faster paths. Express calls `create`, which avoids the general formatter; the microbenchmarks do not establish a noticeable download-throughput improvement. Differences close to parity can vary between runs.

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
integrities, upstream commits, unchanged source-fixture hashes, and the exact
previous VPM implementation retained for reproducible comparisons. Archive
integrities were checked against downloaded bytes. Upstream license notices are
preserved; fixtures are comparison material only. VPM's own implementation also
uses the span-scanning approach in its `vcontent-type` package.
