# vanynum

Normalize Unicode decimal digits and three numeric minus signs to ASCII.
The compatibility baseline is **anynum 1.0.1**, checked October 30, 2026.
Zero runtime dependencies; Node 24 and Bun; browser-compatible JavaScript.

```js
const anynum = require('vanynum');
anynum('−१२.३४'); // '-12.34'
anynum('𝟙２٣');    // '123'
```

Default and named ESM imports are also available:
`import anynum, {anynum as normalize} from 'vanynum'`.

## API and compatibility

`anynum(value)` returns a string with decimal digits normalized to `0`–`9`.
Non-string inputs are returned unchanged, without coercion. Strings needing no
conversion are returned unchanged. It converts U+2212, U+FF0D and U+FE63 to `-`.
Other characters, including punctuation dashes, separators, ideographic numerals,
emoji and unpaired surrogates, pass through. This is not locale-aware number
parsing: `anynum('٣٫١٤')` is `'3٫14'`, not `'3.14'`.

## Compared with anynum 1.0.1

| Behavior | Upstream | VPM |
| --- | --- | --- |
| Decimal-digit coverage | Hand-maintained list covers 610 digits | Generated Unicode 18.0.0 data covers all 770 decimal digits, including 160 omitted upstream |
| Lookup storage | 63,904-byte BMP table plus supplementary Map | 13,308 bytes of typed lookup tables, including a compact page index |
| Unchanged ASCII | Per-character JavaScript scan | Native scan can return unchanged text directly |
| Signs, separators, non-string inputs | Existing policy | Preserved |
| Entry points and declarations | ESM; no bundled declarations | CommonJS, default/named ESM imports and self-contained types |

The data version is pinned independently of the JavaScript runtime's Unicode
version. Coverage changes only when that snapshot is intentionally updated.
The lookup byte comparison excludes module code and runtime object overhead.

## Evidence

All 32 retained upstream cases and six focused tests pass on Node 24 and Bun.
The focused suite checks every decimal digit, every other Unicode code point,
range boundaries, isolated surrogates and long mixed input. `vstrnum` exercises
normalization through fast-xml-parser 5.11.2; current Storage callers retain their
default policy of leaving Unicode numeric conversion disabled.

See [paired benchmarks](bench/results/README.md), including all raw runs and
identical-upstream controls, and the [conformance fixture](../../scripts/numbers-conformance).
ASCII numbers take about 17% / 19% less time on Node / Bun. Dense mixed Unicode
conversion is about 10% slower on Bun; the benchmark report retains that regression
and the process variation. These measurements do not establish application-level gains.

## Provenance

API and comparison tests follow the MIT-licensed anynum 1.0.1. The implementation
uses generated [Unicode 18.0.0 decimal data](https://www.unicode.org/Public/18.0.0/ucd/extracted/DerivedNumericType.txt),
under Unicode-3.0. [LICENSE](LICENSE) retains both notices;
[PROVENANCE.json](PROVENANCE.json) records pinned sources and changes.
