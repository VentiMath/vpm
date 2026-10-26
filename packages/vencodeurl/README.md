# vencodeurl

Encode whole URL strings while preserving existing percent escapes. Zero external
runtime dependencies, with TypeScript declarations and CommonJS/ES module support.
Requires Node.js 20+ or Bun.

`vencodeurl` is a modernized counterpart to `encodeurl` 2.0.0. It preserves the
function API and ordinary encoding behavior while fixing malformed-Unicode and
percent-escape edge cases.

## Use

```js
const encodeUrl = require('vencodeurl');

encodeUrl('/a b?next=%2Fhome'); // '/a%20b?next=%2Fhome'
encodeUrl('/café');            // '/caf%C3%A9'
encodeUrl('/value%a');         // '/value%25a'
```

ES modules can use `import encodeUrl from 'vencodeurl'`.

## API

### `encodeUrl(value)`

Converts the input using `String(value)` and returns the encoded string:

- Encodes spaces, control characters, and non-ASCII text as UTF-8 percent escapes.
- Preserves URL delimiters, IPv6 brackets, backslashes, carets, and vertical bars,
  matching the character set used by `encodeurl` 2.0.0.
- Preserves every existing `%` followed by two hex digits, including letter case.
  Already-encoded bytes are retained even when they do not form valid UTF-8.
- Encodes other percent signs as `%25`.
- Replaces each unpaired UTF-16 surrogate with U+FFFD before encoding it as
  `%EF%BF%BD`. Valid surrogate pairs remain intact.

Every string input is supported, including malformed UTF-16. Errors from a custom
`toString()` or `Symbol.toPrimitive` method propagate. Missing input preserves the
upstream result, `'undefined'`.

This function encodes a whole URL. It does not parse or validate the destination,
decode existing escapes, normalize paths, or escape HTML. Use `encodeURIComponent`
or `URLSearchParams` when constructing individual query values.

## Corrections to encodeurl 2.0.0

| Input | Upstream result | VPM result |
| --- | --- | --- |
| `'\uD800\uD800'` | Throws `URIError` | `'%EF%BF%BD%EF%BF%BD'` |
| `'%a'` | `'%a'` | `'%25a'` |
| `'%%20'` | `'%25%2520'` | `'%25%20'` |
| `'%2%20'` | `'%252%2520'` | `'%252%20'` |

Native `String.prototype.toWellFormed()` replaces the overlapping surrogate-repair
regular expression. A percent-escape lookahead avoids consuming characters that
belong to the next escape. These differences are intentional corrections to the
upstream encoding contract.

## Validation

Tests include all 65,536 individual UTF-16 code units, short surrogate/percent
combinations, generated strings checked against an independent byte encoder,
idempotence, upstream comparisons, input coercion, and Node HTTP header values.
The upstream implementation is preserved as a test-only fixture and excluded from
the package archive.

## Performance

Compare ordinary inputs against the upstream fixture from the repository root:

```sh
node packages/vencodeurl/bench/compare.cjs
bun packages/vencodeurl/bench/compare.cjs
```

The benchmark consumes results, varies inputs, and alternates implementation order.
It measures encoding calls, not application throughput or request latency.

One local run on October 25, 2026, using Node 24.22.1 and Bun 1.4.0. Each cell is
**encodeurl / vencodeurl** in median nanoseconds per call across seven samples of
50,000 calls; lower is better.

| Workload | Node | Bun |
| --- | ---: | ---: |
| Short plain URL | 193 / 88 | 105 / 56 |
| Already encoded URL | 207 / 106 | 149 / 82 |
| Spaces and markup | 866 / 757 | 634 / 570 |
| Unicode | 901 / 775 | 531 / 496 |
| 2 KB plain path | 2,535 / 2,407 | 7,828 / 3,908 |
| Many existing escapes | 880 / 1,094 | 2,043 / 1,212 |

Short ordinary URLs were about twice as fast in this run. The escape-heavy Node
case was slower; this is not a universal speedup. Results vary with the runtime,
warmup, and garbage collection.

## Install from this repository

From `packages/vencodeurl` in a VPM checkout:

```sh
bun pm pack
```

Then, in the consuming project:

```sh
bun add /absolute/path/to/vpm/packages/vencodeurl/vencodeurl-0.1.0.tgz
```

The package has not been published to a registry.

## Origin and license

Derived from [`encodeurl` 2.0.0](https://github.com/pillarjs/encodeurl/tree/v2.0.0),
commit `5f2205efe622fc7972c4e45ed7cbe7f8d652c299`, by Douglas Christopher Wilson.
MIT licensed; upstream notices are preserved in [LICENSE](LICENSE).
