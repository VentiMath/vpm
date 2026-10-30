# vbytes

Byte-size parsing and formatting for Node.js 24+ and Bun, with zero runtime
dependencies. A VPM counterpart to `bytes` 3.1.2 with complete-input parsing,
exact decimal scaling, and validated formatting options.

```js
const bytes = require('vbytes');

bytes('100kb');                            // 102400
bytes(1536);                              // '1.5KB'
bytes.parse('1.5 MB');                     // 1572864
bytes.format(1234567, {
  unit: 'B', thousandsSeparator: ',', unitSeparator: ' '
});                                       // '1,234,567 B'
```

Native ESM supports `import bytes, { parse, format } from 'vbytes'`. TypeScript
declarations are included and need no Node, Undici, or DOM declarations.

## Parsing

`parse(string | number | null | undefined)` returns a number, or `null` only for
`null` and `undefined`. **Malformed supplied values throw**, including through
the `bytes(string)` shortcut. This is an intentional change from upstream.

- Strings accept an optional sign, digits, an optional decimal fraction, and
  an optional `B`, `KB`, `MB`, `GB`, `TB`, or `PB` suffix, case-insensitively.
  Units use powers of 1024. ASCII spaces are allowed outside the value and
  before its suffix; tabs and line breaks are rejected.
- Strings round down to whole bytes after scaling, including negative values:
  `parse('-1.5') === -2`. Bare decimals and explicit `B` follow the same rule
  as other units. Upstream truncates bare decimals toward zero instead.
- Decimal text is scaled exactly before rounding. For example,
  `'0.99999999999999999999kb'` becomes 1023, not 1024. BigInt work is bounded
  to at most 50 fractional digits; longer input still requires a linear scan.
- Parsed integers must fall within ±`Number.MAX_SAFE_INTEGER`. Finite numeric
  inputs within that magnitude pass through unchanged, including fractions,
  as in upstream. Non-finite and out-of-range inputs throw `RangeError`.
- Malformed strings and unsupported input types throw `TypeError`, without
  invoking object coercion. Exponents, hexadecimal, IEC suffixes such as `KiB`,
  leading-dot decimals, unsupported units, and trailing junk are rejected.

The changed error contract matters for request limits: `raw-body` 3.0.2 treats
a `null` parse result as unlimited. Returning `null` for a newly rejected size
could therefore disable a configured limit. `vbytes` throws before `raw-body`
reads a stream, including when its callback API is used. `body-parser` 2.4.0
rejects malformed limits when middleware is constructed. Missing limits retain
the caller's existing default/unlimited behavior; this package does not impose
a default. Numeric `Infinity` is rejected; callers that deliberately want no
limit must use their consumer's supported omission/null convention.

Code that previously checked `parse(value) === null` for invalid input must
instead catch the exception. This package is not a fully behavior-compatible
alias for all `bytes` inputs.

## Formatting

`format(number, options?)` returns a string, or `null` for non-finite/non-numeric
values. `bytes(number, options)` delegates to it. The dispatcher returns `null`
for other input types. Formatting accepts all finite numbers because its output
is display text, not an exact byte count.

| Option | Default | Contract |
| --- | --- | --- |
| `decimalPlaces` | `2` | Integer from 0 through 100; otherwise `RangeError`. |
| `fixedDecimals` | `false` | Boolean; keep trailing decimal zeros when true. |
| `thousandsSeparator` | `''` | Literal string inserted between integer groups. |
| `unitSeparator` | `''` | Literal string between number and unit. |
| `unit` | Automatic | B through PB, case-insensitive; preserves supplied casing. |

Null/undefined option values use defaults; an empty unit selects automatically.
In particular, `decimalPlaces: null` now uses 2, whereas upstream coerces it to
0. Other invalid option types or unknown units throw `TypeError`. Only own
properties are read, once each, and caller objects are not mutated. Arrays and
non-object option containers are rejected. Inherited options are ignored.

Formatting fixes include literal dollar signs in group separators, removing
trailing zeros even when a fraction contains internal zeros (`1.0100` becomes
`1.01`), and rejecting inherited unit names such as `constructor` instead of
producing `NaNconstructor`. Very large values retain native scientific notation,
without inserting group separators into its exponent. Exports are frozen.

## Verification and performance

```sh
node --test packages/vbytes/test/*.test.cjs
bun test packages/vbytes/test
node packages/vbytes/bench/compare.cjs
bun packages/vbytes/bench/compare.cjs
```

Tests compare ordinary behavior with a pinned, unmodified `bytes` 3.1.2 source
fixture, exercise intentional differences, check 12,000 generated decimal sizes
against a full-precision rational oracle, and compare 30,000 generated formatting
results. The shared HTTP gate substitutes `vbytes` into real `body-parser` and
`raw-body` consumers, with exact/over-limit JSON and binary bodies, chunked
requests, UTF-8 byte counts, gzip expansion, malformed limits, and omitted limits.
The archive gate installs actual tarballs with npm and Bun and checks CJS, ESM,
and TypeScript 7 consumers independently of workspace links.

See the [central comparison](../../IMPROVEMENTS.md#vbytes) for measured timings
and tradeoffs. No application throughput improvement has been established.

## Installation and origin

This package is currently part of the VPM workspace. To consume it outside the
workspace, run `bun pm pack` in `packages/vbytes` and install the resulting
`vbytes-0.1.0.tgz` with npm or Bun. This does not imply npm publication or native
VPM registry support. Test fixtures and benchmarks are excluded from the archive.

The API and comparison baseline come from
[bytes 3.1.2](https://github.com/visionmedia/bytes.js/tree/9ddc13b6c66e0cb293616fba246e05db4b6cef4d).
`test/fixtures/UPSTREAM.json` records its npm integrity, release commit, and
source digest. Upstream MIT notices are retained in `LICENSE`.
