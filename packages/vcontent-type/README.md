# vcontent-type

Parse and format HTTP Content-Type values. Zero runtime dependencies, Node.js
20+, CommonJS, native ES module imports, and bundled TypeScript declarations.
The compatibility target is `content-type` **2.1.0**, used by the pinned Express
5.3.0, body-parser 2.4.0, type-is 2.1.0, and negotiator 1.1.0 consumers.

```js
const { parse, format } = require('vcontent-type');
// ESM: import { parse, format } from 'vcontent-type';

const content = parse('Text/HTML; Charset="UTF-8"');
content.type;                  // 'text/html'
content.parameters.charset;    // 'UTF-8'
content.parameters.charset = 'utf-16le';
format(content);               // 'text/html; charset=utf-16le'
```

## What changes

- Each parameter dictionary has a **direct null prototype**. Upstream 2.1.0 and
  3.1.1 use an intermediate shared prototype; writing `charset` onto that
  prototype can suppress `charset` in subsequent parses. Tests reproduce this
  interference and verify isolation here. Ordinary result mutation stays local.
- Non-string headers, invalid offsets, and non-boolean flags fail explicitly.
  Upstream can return fractional, infinite, or `NaN` indices for invalid offsets.
- Formatting requires string types and parameter values. It always returns a
  string on success, avoids implicit coercion, and does not echo invalid values
  in its own error messages. The exported methods are immutable.
- Quoted strings use complete spans instead of character-by-character string
  building. Duplicate or unterminated values do not build discarded strings.
  Native searches handle ordinary unescaped quoted values and semicolon scans;
  escaped values use a bounded scanner. Quoting on output also copies spans.

Upstream 3.1.1 already includes span-based quoted-string processing and other
performance improvements. The shared-prototype and input-validation differences
remain relevant to both comparison versions; this package retains Node 20 and
CommonJS support alongside ES module imports.

## API and compatibility

### `parse(header, options?)`

`header` must be a primitive string. Returns `{ type, parameters, index }`:

- `type` and parameter names are lowercased; values retain their case.
- `parameters` is an independent, mutable null-prototype dictionary. The first
  occurrence of each case-insensitive name wins, including empty values.
- `index` is the absolute offset of the stopping delimiter, or `header.length`.

Options are an object or `null`/`undefined`:

| Option | Default | Meaning |
| --- | --- | --- |
| `parameters` | `true` | `false` stops before the first semicolon and returns an empty dictionary. |
| `comma` | `false` | `true` stops at a comma outside a quoted parameter value. |
| `start` | `0` | Integer offset from zero through `header.length`, inclusive. |

Provided flags must be booleans and a provided offset must be a number within
those bounds. Invalid arguments throw `TypeError`. Request/response objects and
boxed strings are not accepted. Unknown options are ignored.

```js
const header = 'text/html; profile="a,b", application/json;q=0.9';
const first = parse(header, { comma: true });
const second = parse(header, { comma: true, start: first.index + 1 });
second.type; // 'application/json'
```

Parsing preserves 2.1.0's **lenient extraction**: it is not a header syntax
validator. It accepts malformed media types, ignores incomplete parameters and
unterminated quotes, permits whitespace around `=`, and discards trailing text
after a closed quoted value. Only space and horizontal tab are treated as HTTP
optional whitespace. Commas and semicolons inside quotes remain part of the
value; backslash-escaped characters are unescaped. These rules and exact offsets
are checked against both upstream versions, including Unicode and malformed input.

### `format({ type, parameters? })`

Requires a valid string media type and, when provided, an object containing
string parameter values. `null` parameters mean no parameters. Arrays and
non-string values are rejected. Own enumerable string keys are serialized in
insertion order, preserving type/name/value casing. Inherited and symbol keys
are ignored. Neither the object nor its parameters are changed.

Names and media types follow the token grammar; values are quoted as needed,
with quotes and backslashes escaped. Horizontal tab and Latin-1 quoted text are
accepted. Other controls, DEL, and characters above U+00FF are rejected. These
rules follow [RFC 9110's token and quoted-string grammar](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.6).
Invalid input throws `TypeError`. Automatic value coercion is intentionally
removed; callers must convert numbers or other values themselves.

## Validation

```sh
node --test packages/vcontent-type/test/*.test.cjs
bun test packages/vcontent-type/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
```

Fifteen tests cover every starting offset across a fixed edge-case corpus,
20,000 generated headers compared with both upstream versions, 3,000 generated
format/parse round trips, all byte values in formatted parameters, shared-state
interference, invalid API inputs, long values, and CommonJS/ESM imports.

The shared integration gate aliases this package into the four consumers above
and exercises 65 HTTP checks with all VPM replacements installed together. These
include UTF-16 JSON decoding, unsupported charset rejection, weighted Accept
negotiation with quoted commas, and preserving parameters when Express changes
a response charset. CI runs on Node 20, 22, 24 and Bun.

## Performance

Run the comparison against the actual consumer baseline and the newer upstream:

```sh
node packages/vcontent-type/bench/compare.cjs
bun packages/vcontent-type/bench/compare.cjs
node packages/vcontent-type/bench/compare.cjs latest
bun packages/vcontent-type/bench/compare.cjs latest
```

The harness consumes parsed results, verifies equivalent results for each case,
warms both implementations, and alternates execution order across seven samples
of 50,000 calls. Results are microbenchmarks, not application throughput claims.

One sequential local run on Node 24.22.1 and Bun 1.4.0 (2026-10-26), in
nanoseconds per call, **content-type 2.1.0 → VPM**:

| Case | Node | Bun |
| --- | ---: | ---: |
| Type only | 73 → 96 | 194 → 53 |
| Charset | 197 → 274 | 449 → 234 |
| Mixed case | 347 → 446 | 732 → 394 |
| `parameters: false` | 92 → 117 | 218 → 105 |
| Short quoted parameter | 419 → 460 | 987 → 391 |
| 4 KiB quoted value | 23,803 → 500 | 31,857 → 583 |
| Escaped quoted value | 3,992 → 3,936 | 4,568 → 5,134 |
| Duplicate 4 KiB quoted value | 23,115 → 621 | 108,236 → 734 |
| Accept item | 293 → 477 | 341 → 281 |
| Format type | 38 → 37 | 28 → 28 |
| Format charset | 132 → 128 | 79 → 73 |
| Format quoted value | 512 → 298 | 293 → 176 |

Short Node parsing cases took **10–63% longer**; the escaped-value case on Bun
took **12% longer**. Long unescaped quoted values benefited substantially from
native searches. Quoted-value formatting took about **40–42% less time** on both
runtimes. These results establish no general application speedup.

The separate **3.1.1** comparison avoids attributing improvements already made
upstream to VPM. Ratios below are VPM time / upstream time; below 1 is faster:

| Case | Node | Bun |
| --- | ---: | ---: |
| Type only | 1.62 | 0.37 |
| Charset | 1.45 | 0.57 |
| Mixed case | 1.33 | 0.45 |
| `parameters: false` | 2.06 | 0.76 |
| Short quoted parameter | 1.45 | 0.47 |
| 4 KiB quoted value | 0.05 | 0.08 |
| Escaped quoted value | 0.97 | 1.28 |
| Duplicate 4 KiB quoted value | 0.06 | 0.02 |
| Accept item | 1.60 | 1.31 |
| Format type | 0.88 | 0.23 |
| Format charset | 1.16 | 0.61 |
| Format quoted value | 1.07 | 0.79 |

Against 3.1.1, short Node parsing remained **33–106% slower**. Bun's escaped-value
and Accept cases were **28–31% slower**, despite improvements in its other cases.
The isolated dictionaries and explicit input contract are correctness changes;
the tables report their combined cost with the other implementation changes.

## Installation and provenance

The package is available from this repository; a public registry release is not
claimed. Build an archive with `npm pack ./packages/vcontent-type` and install
that archive with npm or Bun. It contains implementation, declarations, README,
license, and package metadata only; tests, fixtures, and benchmarks are excluded.

Derived from MIT-licensed `content-type` by Douglas Christopher Wilson. Parsing
semantics target [2.1.0, commit 8c2fedd](https://github.com/jshttp/content-type/tree/8c2fedda8b40bd519c3ca49cc2a80aebaa1446e3).
The unchanged 2.1.0 npm `dist/index.js` is retained as the `.cjs` test fixture.
Span processing also draws on
[3.1.1, commit d005d8b](https://github.com/jshttp/content-type/tree/d005d8bfd9846bb9eb73a9aad0944536e1a5cf39).
Its unchanged `src/index.ts` is retained with a CommonJS fixture generated using
TypeScript 5.8.3 (`transpileModule`, ES2022 target, CommonJS module output).
Upstream license notices are preserved. Neither comparison fixture is a runtime
dependency, and these tests do not claim to run the complete upstream test suite.
