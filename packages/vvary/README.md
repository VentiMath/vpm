# vvary

A replacement for `vary` 1.1.2 with correct HTTP whitespace handling, explicit
input validation and efficient duplicate detection. Zero runtime dependencies,
CommonJS and native ESM imports, and self-contained TypeScript declarations.

```js
const vary = require('vvary');
// Also: import vary, { append } from 'vvary';

vary.append('Accept-Encoding', 'Origin'); // 'Accept-Encoding, Origin'
vary.append('Accept,\tOrigin', 'origin'); // 'Accept,\tOrigin'
vary.append('Accept', ['Origin', 'origin']); // 'Accept, Origin'
vary.append('Accept', '*'); // '*'

// With a Node/Express response:
// vary(response, 'Origin');
```

Vary records which request fields influence the selected response so caches can
reuse it appropriately. Express uses this utility in `res.vary()` and response
negotiation; CORS uses it for origin and request-header variance. See
[RFC 9110's Vary definition](https://www.rfc-editor.org/rfc/rfc9110.html#section-12.5.5).

## API and improvements

`append(header, field)` returns the updated string. `header` must be a string;
`field` is a comma-separated string or an array of individual names. Names are
ASCII HTTP tokens and compare case-insensitively. New fields retain their first
spelling and order. A wildcard in either list collapses the output to `*`.

`vary(response, field)` reads `response.getHeader('Vary')`, applies `append`, and
writes the result with `setHeader` if it is nonempty and changed. It returns
undefined; Express's wrapper retains its own chaining behavior. Response header
values may be strings, string arrays or undefined. Both methods are checked and
called with the response as their receiver.

Improvements and intentional differences:

- **Correct optional whitespace.** Both spaces and horizontal tabs delimit names.
  Upstream rejects new lists such as `Accept,\tOrigin`, fails to recognize existing
  tab-prefixed duplicates and misses a tab-surrounded wildcard.
- **Complete validation.** Both existing and new lists are checked before a
  response write, even when `*` is present. Upstream only validates the new list.
  Invalid existing names, controls and non-ASCII names throw instead of being
  reflected into the result. Built-in errors do not repeat invalid field text.
- **No implicit coercion.** Values and array entries must be strings. Numeric,
  null, object and sparse-array entries are rejected. Arrays contain individual
  tokens, without surrounding whitespace or commas; string lists accept HTTP
  whitespace and ignore empty members around actual names. An empty field string
  or a list containing only empty members throws; an empty array is a no-op.
- **Single reads.** Field arrays and response header arrays are copied through
  validated single reads. Getters cannot substitute unchecked strings between
  validation and output. Response methods are also captured once.
- **Less repeated work.** A single-name path avoids list allocations. Small
  merges use arrays; larger merges use a Set to avoid quadratic duplicate
  searches. Already-present fields avoid redundant `setHeader` calls.

Existing valid header spelling and formatting are preserved, including existing
repetitions and empty separators; additions use `, `. If the existing string
contains only empty list members, a real addition starts a clean list. This is
not a general-purpose normalizer. Skipping no-op writes is observable to wrappers
that count `setHeader` calls; the resulting HTTP semantics are unchanged.
Unlike upstream, arbitrary truthy response properties and numeric existing Vary
headers are rejected. No response is mutated until validation succeeds.

## Verification

16 focused tests cover upstream compatibility on ordinary lists, 2,000 generated
list merges, all byte values at token boundaries, tabs, wildcards, empty members,
invalid existing headers, duplicate casing, getters, response methods and header
arrays, no-op writes, 2,000-field merges, prototype-shaped names and CJS/ESM imports.

The shared integration gate aliases VPM into real Express and CORS callers and
runs HTTP checks on Node 24.22.1 and Bun 1.4.0. Added response cases cover
arrays, tab-separated fields, case-insensitive duplicates, wildcards and invalid
fields; existing negotiation and preflight checks exercise Vary behavior too.
Packed npm/Bun archives pass Node/Bun CJS/ESM consumers and strict TypeScript
7.0.2 without Node, Undici or DOM ambient types. The response declaration also
accepts a real Node ServerResponse in the workspace type test.

```sh
node --test packages/vvary/test/*.test.cjs
bun test packages/vvary/test
bun run typecheck
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Benchmarks

Recorded 2026-10-27 on macOS arm64, Node 24.22.1 and Bun 1.4.0, against the
unmodified 1.1.2 fixture. Nine alternating-order samples, equal-output checks,
corpus/case warmup and consumed results. Medians are nanoseconds per call; lower
is better. Ordinary cases use 50,000 calls per sample, 50-field merges 5,000 and
500-field merges 1,000. Response cases use a lightweight response-shaped object,
not a live HTTP server.

Single-field operations take roughly **43–73% less time on Node and 45–71% less
on Bun**. The 500-field stress merge takes **78% / 90% less**. More complete
validation still costs time on several ordinary multi-field paths: up to **25%
more on Node and 75% more on Bun**, about 54 ns and 139 ns respectively in those
cases. The 50-field merge is also about 10% slower on Node. No blanket speedup or
application throughput improvement is claimed.

| Case | Node upstream → VPM | Bun upstream → VPM |
| --- | ---: | ---: |
| append first field | 106 → 28 | 115 → 33 |
| append second field | 136 → 78 | 136 → 74 |
| duplicate single field | 123 → 64 | 120 → 56 |
| wildcard | 81 → 42 | 83 → 31 |
| append to three fields | 224 → 255 | 186 → 325 |
| duplicate in three fields | 197 → 225 | 163 → 275 |
| append three fields | 203 → 250 | 222 → 274 |
| append string list | 347 → 353 | 333 → 370 |
| duplicate new fields | 176 → 217 | 187 → 209 |
| merge 50 fields | 4907 → 5415 | 8494 → 5012 |
| merge 500 fields | 273512 → 59784 | 560024 → 53306 |
| response first field | 112 → 36 | 104 → 21 |
| response duplicate | 127 → 70 | 108 → 55 |
| response array header | 219 → 273 | 196 → 278 |

[Harness](bench/compare.cjs), [Node samples](bench/node24.json) and
[Bun samples](bench/bun14.json) include hashes, runtime versions, all samples,
counts and checksums. Reproduce sequentially from the repository root:

```sh
OUTPUT=/tmp/vvary-node.json node packages/vvary/bench/compare.cjs
OUTPUT=/tmp/vvary-bun.json bun packages/vvary/bench/compare.cjs
```

## Distribution and provenance

VPM packages currently install from the workspace or packed archives; this change
does not publish to npm or alter application installations. Run `bun pm pack
--ignore-scripts` in `packages/vvary`, then install the resulting archive with npm
or Bun. Archives contain only source, declarations, metadata, README, license and
provenance. Test fixtures and benchmarks stay in the repository.

Derived from [`vary`](https://www.npmjs.com/package/vary) under MIT; original copyright notices are retained in
[LICENSE](LICENSE). [Provenance](PROVENANCE.json) records the exact release commit,
registry archive integrity and SHA-256 fixture hash. The archive was verified
against npm's SHA-512 integrity before extracting the unmodified comparison
fixture; its license is also retained beside it. No upstream development
dependencies are installed by this package.
