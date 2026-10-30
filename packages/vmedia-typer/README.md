# vmedia-typer

Parse, validate, and format bare media types, with explicit ASCII validation and
consistent parse/format behavior. Zero runtime dependencies. CommonJS, native
ESM named/default imports, and self-contained TypeScript declarations; Node 24+.

```js
const media = require('vmedia-typer');
media.parse('Application/Problem+JSON');
// { type: 'application', subtype: 'problem', suffix: 'json' }
media.format({ type: 'application', subtype: 'problem', suffix: 'json' });
// 'application/problem+json'
media.test('text/html'); // true
```

## Changes from media-typer 1.1.1

- Validate the original ASCII spelling before lowercasing. Unicode `K` no longer
  becomes an accepted `k` in a media name.
- Every accepted parse result can be formatted back to its normalized media
  name, including `application/foo+bar+json`, `text/x+`, and `text/x+!foo`.
  Upstream rejected the first and last examples when formatting and dropped the
  trailing `+` from the middle one.
- Enforce the 127-character limit on the complete subtype, including `+suffix`.
  Upstream could format a value that its own parser rejected for excessive length.
- Explicit field types prevent implicit coercion. Errors do not echo invalid
  input. Exports are frozen; parsed records remain mutable and independent.
- Use strict end-of-input assertions throughout so line terminators cannot be
  accepted by JavaScript's `$` end-anchor exception.

The compatibility baseline is **media-typer 1.1.1**, required by the pinned
Express 5 consumer graph through type-is 2.1.0. Upstream 2.x is ESM-only and is
not the version compared here. These findings do not claim defects in 2.x.

## API and boundaries

`test(string)` returns a boolean; `parse(string)` returns
`{ type, subtype, suffix }`, with lowercase components and an own `suffix`
property that is `undefined` when absent. Parsing splits at the final `+`.
Both functions throw `TypeError` for non-strings; parse also throws for invalid
names. Optional outer ASCII spaces are accepted. Tabs, parameters, wildcard
patterns and non-ASCII names are rejected. Use `vcontent-type` to separate a
Content-Type header's parameters first.

`format({ type, subtype, suffix? })` preserves field casing. Fields must be
strings; `null` or `undefined` suffix means absent, while `''` retains a trailing
`+`. Arrays and invalid names throw `TypeError`. The input is not mutated.
An earlier `+` may remain in `subtype`; a separate suffix cannot contain `+`.

The established 1.x grammar is retained: type and subtype begin with an ASCII
letter or digit and have at most 127 characters each. Subsequent type characters
allow `!#$&^_-`; subtype characters additionally allow `.` and `+`. This is a
syntax check, not a lookup in the IANA registry or a check that a suffix is
registered. It retains 1.x's narrower top-level type alphabet, rather than
claiming to implement every name permitted by
[RFC 6838](https://www.rfc-editor.org/rfc/rfc6838#section-4.2).

## Validation and performance

```sh
node --test packages/vmedia-typer/test/*.test.cjs
bun test packages/vmedia-typer/test
node packages/vmedia-typer/bench/compare.cjs
bun packages/vmedia-typer/bench/compare.cjs
```

Ten tests cover ordinary upstream equivalence, every byte in each name position,
10,000 generated round trips, length boundaries, non-ASCII input, line
terminators, coercion traps, independent results and CJS/ESM exports. The shared
integration gate exercises this package through vtype-is, Express 5 and
body-parser, with HTTP checks on Node and Bun. The archive gate checks npm
and Bun installs and TypeScript 7 CJS/ESM consumers without Node or DOM types.

Sequential local measurements on Node 24.22.1 and Bun 1.4.0, 2026-10-26.
Median nanoseconds/call from seven alternating samples of 50,000 calls after
warmup; the harness verifies equivalent results and consumes parsed fields.

| Case | Node: upstream → VPM | Bun: upstream → VPM |
| --- | ---: | ---: |
| Test lowercase | 65 → 58 | 35 → 26 |
| Test uppercase | 69 → 58 | 52 → 21 |
| Test long subtype | 301 → 268 | 200 → 101 |
| Test invalid | 71 → 58 | 30 → 24 |
| Parse short | 154 → 162 | 118 → 178 |
| Parse suffix | 194 → 207 | 137 → 212 |
| Parse mixed case | 180 → 179 | 148 → 184 |
| Format | 97 → 95 | 54 → 54 |

Validation took less time in these cases, with no unconditional lowercase copy.
Parsing was up to 7% slower on Node and 24–55% slower on Bun. Type-is uses
`test()`, not `parse()`. These are microbenchmarks, not application throughput
measurements; there is no across-the-board speedup claim.

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Installation and provenance

Available from this repository; no public registry release is claimed. Run
`bun pm pack --ignore-scripts` inside this package and install the resulting
archive with npm or Bun. Archives contain only implementation, declarations,
README, license and metadata.

Derived from MIT-licensed media-typer by Douglas Christopher Wilson,
[1.1.1 commit 3aa86fa](https://github.com/jshttp/media-typer/tree/3aa86fae28a1a8ccca1940db9c8d36927956e5fa).
The unchanged npm source and license are retained under `test/fixtures`, with
the source digest and npm integrity in `UPSTREAM.json`. They are excluded from
the archive. Tests do not claim to run the complete upstream test suite.
