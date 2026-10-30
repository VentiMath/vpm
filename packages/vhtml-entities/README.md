# vhtml-entities

HTML entity encoding and decoding targeting **html-entities 2.6.0**, the stable
upstream release checked on October 30, 2026. Zero runtime dependencies;
CommonJS, native ES imports and bundled TypeScript declarations. Verified on
Node.js 24 and Bun, including Google Cloud Storage 8.4.0 error-message decoding.

```js
import {encode, decode, decodeEntity} from 'vhtml-entities';
encode('<p title="雪">A&B</p>');
// &lt;p title=&quot;雪&quot;&gt;A&amp;B&lt;/p&gt;
decode('Access &amp; permission denied'); // Access & permission denied
decodeEntity('&#x1f600;'); // 😀
```

`require('vhtml-entities')` exposes the same three functions. The complete upstream
XML, HTML4 and HTML5 name tables and canonical encoding choices are retained.

## Upstream baseline and fixes

| Behavior in html-entities 2.6.0 | VPM behavior |
| --- | --- |
| Treats U+10FFFF as out of bounds. | Preserves this valid scalar value; only values above it become U+FFFD. |
| Numeric surrogate references produce lone UTF-16 surrogates. | Replaces references from U+D800 through U+DFFF with U+FFFD. |
| `decodeEntity('&#x;')` yields NUL; numeric suffix junk is silently discarded. | Validates the entire numeric reference; malformed input remains unchanged. |
| `decodeEntity('constructor')` can return the inherited Object constructor. | Named maps have no prototype and are frozen; unknown text remains text. |
| Numeric references immediately before `=` remain encoded in attribute scope. | Decodes the numeric reference and preserves the `=`. The named-reference restriction remains. |
| `encode(0)` returns an empty string. | Returns `'0'`; numeric encoding compatibility is explicit in the types. |

Numeric scalar handling and the attribute distinction follow the
[HTML character-reference rules](https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state).
The [control suite](../../scripts/entities-conformance/README.md) reproduces these
upstream results and verifies the corrections.

## API and compatibility

- `encode(text, {level, mode, numeric}?)` defaults to `level: 'all'`,
  `mode: 'specialChars'`, and `numeric: 'decimal'`. It escapes `<`, `>`, `&`, `"`
  and `'`; the apostrophe form remains `&apos;`. Other modes are `nonAscii`,
  `nonAsciiPrintable`, `nonAsciiPrintableOnly`, and `extensive`. They retain
  upstream's exact character-selection rules, including its treatment of controls
  and lone surrogates. `numeric: 'hexadecimal'` uses lowercase hex when a named
  encoding is unavailable. Numbers are converted to strings; arbitrary object
  coercion is rejected.
- `decode(text, {level, scope}?)` defaults to HTML5 body behavior. `level` accepts
  `xml`, `html4`, `html5`, or `all` (an HTML5 alias). `scope` accepts `body`,
  `attribute`, or `strict`. XML defaults to strict; strict requires semicolons.
  Body decoding preserves legacy unterminated-name rules and longest known
  matches. Attribute decoding leaves an unterminated name followed by an ASCII
  letter, digit or equals sign unchanged.
- `decodeEntity(text, {level}?)` decodes exactly one named or numeric reference.
  Decimal and `x`/`X` hexadecimal numbers may omit the semicolon; signs,
  whitespace, missing digits and trailing text are rejected by leaving the input
  unchanged. In contrast, whole-text body decoding may consume a valid numeric
  prefix and preserve the suffix, following HTML tokenization.
- All functions map null, undefined and empty text to `''`. Decoding accepts only
  strings or nullish values. Invalid option objects and enum values throw,
  including for empty text. Only own option fields are read, once each; caller
  options are never changed.

Decoding runs once: `&amp;lt;` becomes `&lt;`, not `<`. Existing C1 numeric remapping
is retained at every level, including XML; this API is not an XML validator.
Encoding keeps upstream's treatment of literal lone surrogates, while decoding
numeric surrogate references now replaces them. These functions transform entity
references; decoding HTML error text does not strip tags or sanitize markup.

## Evidence and performance

**30 retained upstream runtime/metadata cases** and **21 focused tests** pass on
both runtimes. Coverage includes every named entry at each level, all encoding
modes, thousands of seeded comparisons and Unicode references, malformed input,
option getters and long sparse/dense strings. Actual Storage `ApiError` constructors
decode 16 string/Buffer bodies, preserve error metadata, combine/deduplicate
messages and bypass entity decoding for structured JSON errors. Controls run
against the original package too; no live cloud service is used.

[Paired measurements](bench/results/README.md) include plain text, Storage-shaped
HTML errors, dense names, numbers, attributes and encoding. Raw samples, source
hashes, process variation and identical-code controls are retained, including
regressions. Plain-text decoding takes about 83% / 39% less time on Node / Bun,
and Storage-shaped errors about 7% / 17% less. Bun Unicode `nonAscii` encoding
regresses by about 21%; dense named decoding varies by process. Local conversion costs do not measure network or application latency.

MIT. [PROVENANCE.json](PROVENANCE.json) records the upstream commit and integrity,
retained data, encoder origins and intentional changes. [LICENSE](LICENSE) includes
upstream and reused encoder attribution.
