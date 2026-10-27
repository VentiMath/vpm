# vqs

Parse and serialize nested query strings and form fields. Requires Node.js 20+
or Bun, with **zero runtime dependencies**, CommonJS and native ESM named/default
imports, and bundled TypeScript declarations.

```js
import { parse, stringify, formats } from 'vqs';

parse('person[name]=Ada&tags[]=math&tags[]=code');
// { person: { name: 'Ada' }, tags: ['math', 'code'] }

stringify({ person: { name: 'Ada' }, tags: ['math', 'code'] });
// person%5Bname%5D=Ada&tags%5B0%5D=math&tags%5B1%5D=code

stringify({ text: 'hello world~*' }, { format: formats.WHATWG });
// text=hello+world%7E*
```

The CommonJS API is `const { parse, stringify, formats } = require('vqs')`.
The package is available in this workspace and as a standard archive, not yet
on the npm registry. From this directory, run `bun pm pack --ignore-scripts`
and install the resulting archive with npm or Bun.

## API and limits

`parse(input, options?)` returns an object. Strings use the query grammar;
object inputs have their plain objects and arrays copied before processing.
Empty strings, null and undefined return an empty object.

| Parse option | Default | Behavior |
| --- | --- | --- |
| `depth` | `5` | Maximum bracket nesting; excess becomes a literal key unless `strictDepth` is true. `false` means zero. |
| `parameterLimit` | `1000` | Maximum split fields; excess is discarded unless `throwOnLimitExceeded` is true. |
| `arrayLimit` | `20` | Array length/index bound; excess becomes object keys unless `throwOnLimitExceeded` is true. |
| `strictDepth` | `false` | Throw RangeError for nesting beyond the configured depth. |
| `throwOnLimitExceeded` | `false` | Throw RangeError for parameter or array overflow. |
| `duplicates` | `'combine'` | Combine duplicate fields; `'first'` and `'last'` select one value. |
| `plainObjects` | `false` | Create null-prototype output containers. |
| `allowPrototypes` | `false` | Permit ordinary prototype-named fields; `__proto__` query segments remain blocked. |
| `strictMerge` | `true` | Retain qs 6.17's scalar/container conflict behavior. |

Numeric bounds must be nonnegative safe integers or `Infinity`; omission uses
the default. Invalid values throw TypeError, including NaN, fractions, negatives,
unsafe integers, strings and null. Explicit Infinity removes that bound. A
parameter count does not limit bytes: bound the HTTP body/query size in the caller.

Other supported parse options are `allowDots`, `decodeDotInKeys`, `allowEmptyArrays`,
`allowSparse`, `parseArrays`, `comma`, `charset`, `charsetSentinel`,
`interpretNumericEntities`, `strictNullHandling`, `ignoreQueryPrefix`, `delimiter`
(string or RegExp), and a custom `decoder`. Custom decoders receive
`(value, defaultDecoder, charset, 'key' | 'value')`; returning null for a key
omits it. The generic parsed-value type reflects custom decoded values.

`stringify(object, options?)` returns a string. It supports array formats
`indices` (default), `brackets`, `repeat`, and `comma`; `commaRoundTrip`;
`allowDots` / `encodeDotInKeys`; null/empty-array handling; `encodeValuesOnly`;
custom `encoder`, `filter`, `sort`, `serializeDate` and `delimiter`; and
`addQueryPrefix`. Frozen filter arrays are accepted without modification.

Its `depth` defaults to Infinity; finite bounds throw RangeError for deeper
input. Cycles throw RangeError while shared sibling references are allowed.
Very deep acyclic inputs can still reach the runtime's recursion limit.

Both methods support UTF-8 and ISO-8859-1, including charset sentinels and the
existing Latin-1 numeric-entity behavior. Serialization formats are `RFC3986`
(default), `RFC1738`, and `WHATWG`. Custom encoders receive
`(value, defaultEncoder, charset, 'key' | 'value', format)`.
See [index.d.ts](index.d.ts) for the full option types and the
[upstream API guide](https://github.com/ljharb/qs/tree/bebfa1ab2ed4e5d6cd9317d42a65609296ebd2cb#readme)
for retained grammar and option examples.

## Changes from qs 6.17.0

- Native Map, WeakMap and Object.defineProperty replace two direct and **18
  distinct total external runtime dependencies**. Helper sources exist only in
  the comparison fixture and are excluded from the installable archive.
- Native UTF-8 percent encoding preserves all three formats and replacement of
  lone surrogates. Flat keys skip numeric-index parsing, merges avoid per-field
  reduce callbacks, and unused tracking maps are allocated lazily.
- Invalid numeric limits fail explicitly. Use zero instead of a negative
  `arrayLimit`; omit a limit instead of supplying null or another non-number.
- Parameter bounds at/above the uint32 split boundary retain their stated meaning
  instead of wrapping to zero or a smaller limit.
- Wide arrays append output fields without a variadic call, avoiding the engine's
  function argument-count ceiling. Normal memory and string-size limits still apply.

This baseline was checked on 2026-10-27 and is within Express 5.3.0 and body-parser
2.4.0's declared ranges. The pinned HTTP fixture was upgraded from qs 6.16.1.
The WHATWG format, recent prototype-copying fixes, duplicate-limit fixes, filter
array copying and lone-surrogate corrections already exist in upstream 6.17.0;
they are retained upstream behavior, not VPM inventions.

No application-wide throughput or security outcome is inferred from these changes.
Removing this package's helper tree does not remove helpers still used by other
application dependencies.

## Verification and provenance

Run from the repository root:

```sh
node --test packages/vqs/test/*.test.cjs
bun test packages/vqs/test/query.test.cjs
node packages/vqs/bench/compare.cjs
bun packages/vqs/bench/compare.cjs
npm run typecheck
npm --prefix scripts/consumers ci --ignore-scripts
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

Tests cover the option matrices, 6,200 deterministic mixed-key parses, every
UTF-16 code unit in every format, astral characters, malformed escapes, custom
hooks, object ownership, cycles, prototype guards, limits and 200,000-element
serialization. HTTP checks exercise Express extended queries and body-parser's
nested forms, charset sentinels, malformed encodings, depth failures and parameter
limits. Archive checks install with npm and Bun, test both module systems on both
runtimes, and compile strict TypeScript 7 consumers without ambient Node/DOM types.

The benchmark checks output parity before timing 9 alternating samples of 10,000
calls, after 5,000 warmup calls per implementation and case. It uses the published
upstream CommonJS source with its real pinned dependency tree, with no VPM code
substituted into the baseline. Raw results and source hashes are recorded in
`bench/`; measured gains and regressions appear in
[the central improvements record](../../IMPROVEMENTS.md#vqs).

Derived from [qs 6.17.0](https://github.com/ljharb/qs/tree/bebfa1ab2ed4e5d6cd9317d42a65609296ebd2cb),
BSD-3-Clause licensed, copyright Nathan LaFreniere and other contributors.
Original notices are preserved in [LICENSE](LICENSE).
[PROVENANCE.json](PROVENANCE.json) records the original source hashes and VPM
changes; `test/fixtures/provenance.json` hashes the immutable comparison files,
including each dependency's own license. Fixtures and benchmarks are never packed.
