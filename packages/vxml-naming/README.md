# vxml-naming

Validate and repair XML names, with diagnostics and bounded memoized validators.
The API baseline is **xml-naming 0.3.0**, checked October 30, 2026. Zero runtime
dependencies; CommonJS and ESM, tested on Node 24 and Bun.

```js
const { qName, createValidator, sanitize } = require('vxml-naming');
qName('svg:circle');                         // true
qName('𐀀:part');                            // true in XML 1.0 and 1.1
const check = createValidator('qName', {maxCacheSize: 2048});
check('PartNumber');                         // true
check.reset();
sanitize(':1', 'qName');                     // '_:_1'
```

ESM supports the same named exports: `import { qName } from 'vxml-naming'`.

## API and compatibility

| Export | Meaning |
| --- | --- |
| `name(text, options?)` | XML Name; colons may occur anywhere |
| `ncName(text, options?)` | Non-colonized Name |
| `qName(text, options?)` | One NCName, or two NCNames separated by one colon |
| `nmToken(text, options?)` | One or more NameChar characters, including digit starts |
| `nmTokens(text, options?)` | Normalized Nmtokens: tokens separated by single ASCII spaces |
| `createValidator(production, options?)` | Memoized predicate with `reset()` |
| `validate(text, production, options?)` | `{valid, production, input}`, plus `reason` and UTF-16 `position` on failure |
| `validateAll(texts, production, options?)` | Array of diagnostic results |
| `sanitize(text, production = 'name', options?)` | Valid output for the selected production |

`asciiOnly: true` restricts characters to ASCII. `xmlVersion` accepts `'1.0'`
and `'1.1'`; both use the identical name productions in XML 1.0 Fifth Edition
and XML 1.1 Second Edition. Upstream's fallback for other version values is
preserved because the current parser passes numeric and nested values.
Non-string inputs, unknown productions and invalid option containers throw
`TypeError`, instead of coercing inputs. `asciiOnly` must be boolean when supplied.

A validator's `maxCacheSize` defaults to 2048 and must be a nonnegative safe
integer. Zero disables caching. After capacity is reached, existing entries
remain cached and new inputs are still validated. Options are fixed at creation.

Sanitization replaces invalid characters with `replacement` (default `_`),
removes colons from NCNames, and repairs both components of QNames. Subsequent
colons in a QName become replacements. Nmtokens sanitization trims outer
whitespace and normalizes XML whitespace separators. Replacements must be
nonempty strings of non-colon NameChar characters. If a replacement such as `-`
cannot start a name, `_` supplies the prefix. Repairs are deterministic and
idempotent, but can collide: this is not a unique-identifier generator.

QName validation checks syntax, not namespace bindings or reserved-prefix rules.
It does not validate a complete XML document.

## Corrections relative to xml-naming 0.3.0

- Both XML editions accept U+0487 and supplementary U+10000–U+EFFFF name characters.
- XML 1.1 rejects multiplication/division signs U+00D7 and U+00F7.
- Nmtokens uses the normalized XML production instead of arbitrary JavaScript whitespace.
- Diagnostics use the same character grammar as predicates, including the start of each QName component and supplementary characters.
- Sanitization rejects invalid replacements and repairs invalid starts, colons, excluded characters and lone surrogates.
- Cache limits cannot be infinite, fractional or negative; inputs are not implicitly converted to strings.

The authoritative productions are in [XML 1.0](https://www.w3.org/TR/xml/#NT-NameStartChar),
[XML 1.1](https://www.w3.org/TR/xml11/#NT-NameStartChar), and
[Namespaces in XML](https://www.w3.org/TR/xml-names/#NT-QName).

## Evidence and scope

All **78 retained upstream cases** execute. Eight assertions in six cases are
explicitly corrected to the W3C productions; the unchanged tests also run
against the pinned upstream package. Focused tests check every Unicode code point
at a name start and continuation, cache boundaries, input contracts, diagnostics,
and 20,000 generated repair/validation combinations.

The [shared caller fixture](../../scripts/xml-helpers-conformance) replaces imports
in actual fast-xml-parser **5.11.2** and fast-xml-builder **1.3.1** source. It checks
DTD names and entities, ordinary and ordered builders, and Storage **8.4.0**
multipart uploads. The parser's separately implemented `XMLValidator` still
rejects supplementary names; that limitation belongs to the future parser
replacement. The builder validates names only when `sanitizeName` is configured.
Storage's ordinary multipart path creates validators but does not validate names.

[Benchmarks](bench/results/README.md) include raw samples, source hashes,
upstream controls and regressions. These measurements do not establish an
application speedup or a deployed dependency replacement.

MIT attribution is retained in [LICENSE](LICENSE); [PROVENANCE.json](PROVENANCE.json)
records the upstream version and source commit.
