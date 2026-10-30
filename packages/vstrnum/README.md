# vstrnum

Convert numeric strings under explicit parsing options, preserving text when
conversion is disabled or the input is not numeric. The compatibility baseline
is **strnum 2.5.1**, checked October 30, 2026. One runtime dependency: `vanynum`.
Tested on Node 24 and Bun; the implementation also uses only browser-compatible JavaScript.

```js
const toNumber = require('vstrnum');
toNumber(' 12.2500 ');                         // 12.25
toNumber('0012', {leadingZeros: false});       // '0012'
toNumber('9007199254740993');                  // original text
toNumber('−१२.५', {unicode: true});             // -12.5
toNumber('1e309', {infinity: 'null'});          // null
```

Default ESM import: `import toNumber from 'vstrnum'`.

## API

`toNumber(value, options?)` returns a number, the original value, or `null` when
the infinity policy requests it. Non-string values pass through unchanged.
Whitespace is trimmed for parsing; rejected input preserves its original spelling.

| Option | Default | Meaning |
| --- | --- | --- |
| `hex` | `true` | Parse lowercase `0x` prefixes, including an optional sign |
| `binary` | `false` | Parse unsigned lowercase `0b` prefixes |
| `octal` | `false` | Parse unsigned lowercase `0o` prefixes |
| `leadingZeros` | `true` | Permit multiple integer digits beginning with zero |
| `eNotation` | `true` | Permit exponent input and ordinary decimals whose numeric output uses exponent notation |
| `unicode` | `false` | Normalize decimal digits and numeric minus signs with `vanynum` |
| `skipLike` | none | A RegExp or object with `test(text)`; matching trimmed input remains text |
| `infinity` | `'original'` | `'original'`, `'null'`, `'infinity'`, or `'string'`; case-insensitive |
| `decimalPoint` | reserved | Ignored, as upstream; decimal syntax always uses `.` |

Only own option fields are read. Options remain live between calls; nothing is
cached or mutated. `null` options use defaults. Invalid option containers or
`skipLike` objects throw `TypeError`; unknown or non-string infinity modes use
`'original'`. Global/sticky patterns match from index zero and their original
`lastIndex` is restored, including on thrown errors.

This is not an exact-decimal or arbitrary-precision library. Ordinary finite
decimals retain upstream roundtrip checks, but exponent inputs, radix inputs and
ordinary numbers rendered in exponent form retain JavaScript rounding. For example,
`toNumber('9007199254740993e0')` returns `9007199254740992`. Underflow may become
signed zero. The upstream `00e2` policy is preserved: it remains text even with
`leadingZeros: true`. Uppercase radix prefixes and signed binary/octal inputs
remain text. Unicode separators are not normalized.

## Compared with strnum 2.5.1

| Behavior | Upstream | VPM |
| --- | --- | --- |
| Overflow and parsing options | Overflow bypasses `eNotation` / `leadingZeros` checks | Syntax and option checks run before infinity handling |
| Radix overflow | Returns infinity regardless of policy | Applies the requested infinity policy |
| `leadingZeros: false` | Rejects `-0`, `+0`, and `0.1e2` | Accepts a single integer zero; rejects actual leading-zero prefixes |
| Global/sticky `skipLike` | Advances `lastIndex`, changing later results | Repeatable matching with restored caller state |
| Option copying | Allocates a merged object; an own `__proto__` can inject `skipLike` | Direct own-field reads, without merging or prototype mutation |
| Unicode digits | anynum's incomplete list | All 770 decimal digits from pinned Unicode 18.0.0 |

These are intentional behavioral differences, covered by controls that reproduce
the upstream results. All 47 retained upstream test cases still pass.

## Evidence

Eight focused tests cover the fixes, precision policy, malformed input, long
strings and identity preservation. The shared fixture retains 32 additional
anynum cases. Actual fast-xml-parser 5.11.2 source performs 12 differential XML
cases and two intentional-difference cases. Storage 8.4.0 performs two complete
multipart uploads through that parser, using string and Buffer XML responses.
All checks run on Node 24 and Bun.

See [paired benchmarks](bench/results/README.md) for raw results and controls,
and the [conformance fixture](../../scripts/numbers-conformance) for caller scope.
All measured parsing cases improve on both runtimes; parsing with the XML defaults
takes about 56% less time on Node and 66% less on Bun in these local microbenchmarks.
The XML parser's distributed CommonJS bundle embeds strnum, so the fixture replaces
only the strnum import in its unbundled source before supplying it to Storage.
This does not change the installed application or claim a deployed migration.

## Provenance

MIT; upstream attribution is retained in [LICENSE](LICENSE).
[PROVENANCE.json](PROVENANCE.json) records versions, source commits and changes.
