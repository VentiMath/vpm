# vnegotiator

HTTP content negotiation with validated quality values, deterministic ties and
one parse per offered value. A callable/new-able counterpart to negotiator
1.1.0, with its four header families and legacy method aliases. Node 20+,
CommonJS, native ESM default/named imports and self-contained TypeScript types.

```js
const Negotiator = require('vnegotiator');
const request = { headers: { accept: 'text/html;q=0.5, application/json' } };
const n = Negotiator(request); // new Negotiator(request) also works
n.mediaType(['text/html', 'application/json']); // 'application/json'
n.mediaTypes(['text/html', 'application/json']); // ['application/json', 'text/html']
```

## Improvements

- Quality values must decode to a complete decimal from 0 through 1, with at
  most three fractional digits. `q=2`, `q=0.8junk`, `q=`, exponent notation,
  signed numbers and `.5` no longer receive a positive weight. A syntactically
  valid range with an invalid weight acts as `q=0`, so a broader wildcard cannot
  silently re-enable it. This follows the numeric grammar in
  [RFC 9110 §12.4.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-12.4.2).
- Media ranges with more matching parameters take precedence over less
  specific ones. An explicit zero on the more specific range remains an
  exclusion even if a less specific range has a higher weight.
- Media parameter values are compared exactly, except for case-insensitive
  charset labels. A profile value of `*` is literal, not a parameter wildcard.
  Upstream lowercased all parameter values and treated `*` as matching any value.
- Equally specific, equally weighted duplicate entries retain their first
  header position. Upstream's later duplicate could change the winner.
- Each offered media type or language is parsed/validated once per call, then
  compared with all accepted ranges. Result mapping uses stored offer indexes
  and values instead of repeatedly searching the original result array.
- Absent headers avoid synthetic wildcard parsing for offered values. Bare
  offered charset, encoding and language names skip the parameter parser.
- Own header fields and string arrays are supported. Names are validated before
  Unicode folding; exports and the method prototype are frozen. Results and
  request references remain mutable, with no stale cross-call caches.

## API

`Negotiator(request)` and `new Negotiator(request)` create an instance holding
the public, replaceable `request` property. Requests must have a headers object
with lowercase Node-style field names. Only own fields are read. A string array
is joined as an HTTP list; invalid supplied values behave as an empty field.
Invalid request shapes throw `TypeError`.

| Singular: best value or `undefined` | Plural: ordered array | Header |
| --- | --- | --- |
| `mediaType(available?)` | `mediaTypes(available?)` | `accept` |
| `charset(available?)` | `charsets(available?)` | `accept-charset` |
| `encoding(available?, options?)` | `encodings(available?, options?)` | `accept-encoding` |
| `language(available?)` | `languages(available?)` | `accept-language` |

Omit `available`, or pass `null`, to list acceptable header values; an empty
available array produces an empty result. Non-array offered lists throw.
Malformed or non-string offers are skipped without coercion. Matching returns
the original offered strings. Listing preserves header name spelling and
removes parameters. None of these methods mutate caller arrays.

Encoding options accept `{ preferred: ['br', 'gzip'] }` to break equal-quality
ties using case-insensitive server preferences. Otherwise ties use specificity,
parameter count, header order and offer order. All eight `preferredCharset(s)`,
`preferredEncoding(s)`, `preferredLanguage(s)` and `preferredMediaType(s)` aliases
are retained. The CommonJS `.Negotiator` property and ESM named `Negotiator`
export refer to the same constructor.

## Compatibility boundaries

The target is the installed **negotiator 1.1.0**, using **vcontent-type** as its
only runtime dependency. This preserves upstream's public root API; internal
`lib/` paths are not exported.

Absent Accept, Accept-Charset and Accept-Language fields permit any offered
value. Explicitly empty fields permit none. Absent/empty Accept-Encoding retains
upstream's conservative identity-only behavior; explicit identity and wildcard
exclusions and upstream's implicit identity weight are preserved. This package
does not choose compression implementations or send HTTP responses.

Language matching deliberately retains upstream's base/regional fallback and
priorities. It is not a complete RFC 4647 language lookup implementation.
Parameters use vcontent-type's tolerant parser: quoted numeric weights remain
accepted, the first duplicate parameter wins, and other malformed parameter
syntax retains that parser's behavior. Validation of decoded quality values
does not claim strict validation of the entire header grammar. Parameter values
other than `charset` use exact comparison; media types requiring some other
case-insensitive parameter semantics may need caller normalization.

The stricter numeric syntax (including rejecting `.5`), parameter comparisons,
name validation, tie handling, frozen exports and own-header rules are intentional
compatibility differences. `q=0.5` is the supported spelling for one half.

## Validation and performance

```sh
node --test packages/vnegotiator/test/*.test.cjs
bun test packages/vnegotiator/test
node packages/vnegotiator/bench/compare.cjs
bun packages/vnegotiator/bench/compare.cjs
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

Fourteen tests cover upstream differential cases, 20,000 generated preference
lists across the four headers, exclusions, parameter specificity, quoted commas
and escapes, duplicate ties, identity encoding, language fallback, header arrays,
Unicode input, mutable requests, invalid inputs, imports and legacy aliases.
The shared gate runs HTTP checks through Express 5 and Functions Framework,
including all `req.accepts*()` methods and `res.format()` with 406 responses.
Types are checked with real Node HTTP/HTTP2 requests and without platform types.
The archive gate checks npm/Bun installs and CJS/ESM consumers on both runtimes.

Sequential local run on Node 24.22.1 and Bun 1.4.0, 2026-10-26. Median
nanoseconds/call, seven alternating samples of 50,000 calls after warmup. The
harness checks equivalent results and consumes all returned values. Upstream
sources and dependencies are pinned; these are microbenchmarks, not application
throughput measurements.

| Case | Node: upstream → VPM | Bun: upstream → VPM |
| --- | ---: | ---: |
| Two media offers | 1,275 → 1,217 | 1,268 → 1,392 |
| Quoted media parameter | 1,923 → 4,199 | 1,958 → 2,212 |
| 16 media ranges × 16 offers | 50,208 → 13,965 | 57,971 → 16,623 |
| List accepted media types | 984 → 1,304 | 860 → 1,850 |
| Media offers, absent header | 608 → 330 | 733 → 492 |
| Encodings | 842 → 1,173 | 870 → 1,222 |
| Encoding server preference | 634 → 868 | 657 → 977 |
| Languages | 1,777 → 1,609 | 2,069 → 1,572 |
| Charsets | 524 → 765 | 721 → 857 |

The 16-by-16 case took **71–72% less time** on both runtimes. Absent-header
media selection and language selection also improved. Small cases have real
costs: quoted-parameter selection took **118% longer on Node**, accepted-media
listing took **115% longer on Bun**, and encoding/charset cases were **19–49%
slower**. These results do not support a universal speedup claim.

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Installation and provenance

Available from the repository; no public registry release is claimed. Run
`bun pm pack --ignore-scripts` inside this package and `vcontent-type`, then
install both archives together. Bun consumers also need matching local archive
`file:` mappings in `overrides` so unpublished transitive names are not looked
up in the public registry. The shared archive gate demonstrates this setup.

Derived from MIT-licensed negotiator by Federico Romero, Isaac Z. Schlueter,
Douglas Christopher Wilson and Blake Embrey. The baseline is
[1.1.0, commit 14b0a7b](https://github.com/jshttp/negotiator/tree/14b0a7b88e7e7bb1cae38681195951bff29ca2fd).
Unchanged npm sources and license are under `test/fixtures/negotiator-1.1.0`,
with source digests and npm integrity in `test/fixtures/UPSTREAM.json`.
Tests supply the committed content-type 2.1.0 source as its sole dependency.
Fixtures and benchmarks are excluded from archives. These tests do not claim to
run the complete upstream test suite.
