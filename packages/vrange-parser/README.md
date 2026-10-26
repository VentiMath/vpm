# vrange-parser

Strict HTTP range parsing for Node.js 20+ and Bun, with no runtime dependencies.
A counterpart to `range-parser` 1.2.1 with exact numeric syntax, safe bounds,
oversized suffix handling, and stable ordering when combining ranges.

## Use

```js
const parse = require('vrange-parser');

parse(100, 'bytes=0-9,5-19', { combine: true });
// [{ start: 0, end: 19 }, type: 'bytes']

parse(100, 'bytes=-1000'); // [{ start: 0, end: 99 }, type: 'bytes']
parse(100, 'bytes=200-');  // -1
parse(100, 'bytes=1junk-9'); // -2
```

ES modules can use `import parse from 'vrange-parser'`. Bundled declarations
describe the return union and the array's `type` property.

## API and differences

`parse(size, header, options?)` returns inclusive `{ start, end }` ranges with
`ranges.type`, `-1` when no member selects bytes, or `-2` for malformed syntax.
`size` must be a non-negative safe integer; invalid sizes and non-string headers
throw `TypeError`. Bigint representation sizes are not supported by this numeric
range API.

- Numeric members require complete decimal syntax. Fractions, signs, extra
  hyphens, embedded spaces, and suffix junk are rejected. If one member is
  malformed, the whole header returns `-2`; valid members do not hide bad ones.
- Huge decimal positions are clamped before arithmetic. Returned endpoints stay
  exact even when an input numeral exceeds JavaScript's safe integer range.
- A suffix larger than a nonempty representation selects the entire content,
  following [HTTP byte-range semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-14.1.2).
- Unit tokens are validated and normalized to lowercase. Unknown valid tokens
  remain available to callers, which decide whether they support that unit.
- Spaces/tabs around list members and empty members are tolerated. An empty list
  is malformed. Reversed or out-of-bounds intervals and zero-length suffixes
  select no bytes; other satisfiable members are retained.
- `combine: true` merges overlapping/adjacent intervals and returns groups in the
  order of their earliest contributing input member. A contained member now
  contributes to that ordering, fixing an upstream corner case.

The API continues to return `-1` for empty representations, including suffix
requests; it does not represent an empty interval with a negative endpoint.
Applications remain responsible for method eligibility, supported units, and
request/header limits. In Express/send, malformed `-2` ranges are ignored and
produce the full response; unsatisfiable `-1` ranges produce 416.

## Validation and performance

Eight tests cover differential ordinary ranges, oversized suffixes, huge decimal
values, malformed input, unit casing, bounds, and contained-range ordering.
Two thousand generated range sets are compared against an independent byte-set
model. Express 4.22.1 and 5.2.1 checks on Node and Bun exercise real 206, 416,
malformed-range fallback, and oversized-suffix responses.

From the repository root:

```sh
node packages/vrange-parser/bench/compare.cjs
bun packages/vrange-parser/bench/compare.cjs
```

One local run on October 26, 2026. Cells are **upstream / VPM**, median nanoseconds
per call across seven alternating samples of 50,000 calls after warmup. Range
counts and endpoints are consumed; no file reads or HTTP I/O are measured.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Closed range | 198 / 187 | 133 / 178 |
| Open-ended range | 215 / 180 | 150 / 173 |
| Suffix | 213 / 183 | 156 / 181 |
| Combine eight separate ranges | 1,790 / 1,696 | 1,068 / 1,316 |
| Combine eight overlapping ranges | 1,637 / 1,505 | 963 / 1,142 |

These cases were 5–16% faster on Node and **15–34% slower on Bun**. Stricter
validation has a runtime-dependent cost. No application throughput gain or
memory reduction is established; measurements vary across runs.

## Install and origin

Run `bun pm pack` here, then `bun add /absolute/path/to/vrange-parser-0.1.0.tgz`
in the consumer. This package has not been published by VPM to a registry.
Fixtures and benchmarks stay out of its archive.

Derived from [`range-parser` 1.2.1](https://github.com/jshttp/range-parser/tree/0f56ff8d4b579599f9f225f0a19f4ef1628c585f),
by TJ Holowaychuk and Douglas Christopher Wilson. The fixture is verified against
that commit. MIT licensed; notices are preserved in [LICENSE](LICENSE).
