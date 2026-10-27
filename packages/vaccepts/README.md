# vaccepts

Express-compatible content negotiation using **vnegotiator** and **vmime-types**.
Provides the familiar extension shortcuts and boolean/string/list return API
from accepts 2.0.0. Node 20+, CommonJS, native ESM default imports and
self-contained TypeScript declarations.

```js
const accepts = require('vaccepts');
const request = { headers: { accept: 'text/html;q=0.5, application/json' } };
accepts(request).types('html', 'json'); // 'json'
accepts(request).types(); // ['application/json', 'text/html']
```

## Improvements

- Uses vnegotiator's validated weights, parameter specificity, exact parameter
  comparisons and stable duplicate ordering. Malformed weights such as `q=2`
  and `q=0.8junk` no longer select an unwanted representation.
- Distinguishes an absent Accept header from an explicitly empty one. The empty
  field returns `false` when offered types, rather than unconditionally picking
  the first offered type.
- Validates offers even when Accept is absent. Unknown extensions, malformed
  media types and non-string entries cannot bypass matching. The first valid
  offer wins without ranking or normalizing the remaining offers.
- Keeps the public `headers` view and negotiation coherent when the caller
  replaces `request.headers`. Upstream held the original headers separately
  while its negotiator read the replacement, allowing contradictory results.
- Maps each normalized media type to its first original offer, preserving
  extension aliases and caller spelling without the old map/filter/index-search
  sequence. Exports and the method prototype are frozen.

## API and compatibility

`Accepts(request)` and `new Accepts(request)` both return an instance. The request
must have lowercase Node-style headers. Its public `.negotiator` is a
vnegotiator instance; `.headers` is a read-only view of that negotiator's current
request headers. Header contents and the request can still be changed by callers.

| Equivalent methods | Meaning |
| --- | --- |
| `type`, `types` | Media types or extensions such as `html` or `json` |
| `encoding`, `encodings` | Content codings such as `gzip`, `br`, `identity` |
| `charset`, `charsets` | Charset labels such as `utf-8` |
| `lang`, `langs`, `language`, `languages` | Language preferences |

Every method accepts either an array or variadic strings. With offers, it returns
the best matching original string or `false`. With no arguments or an empty
array, it returns an ordered array of acceptable header values. TypeScript
overloads distinguish no arguments, an empty tuple, a nonempty tuple and a
general array whose emptiness is unknown. Invalid request shapes throw;
non-string offers are skipped without coercion.

With no Accept header, the first valid offered type wins. For explicit media
types, names and parameters are processed by vnegotiator; extensions are mapped
through vmime-types. Multiple extensions mapping to one MIME type retain the
first original offer. Input arrays are not modified or cached.

All [vnegotiator compatibility boundaries](../vnegotiator#compatibility-boundaries)
apply, including decoded quality syntax (`0.5`, not `.5`), parameter value case,
first duplicate parameter, language fallback, identity encoding and own-header
handling. Empty Accept, invalid first offers, header replacement and the
read-only `.headers` property are additional deliberate differences from accepts.
An application decides when a failed negotiation should produce HTTP 406.

The baseline is **accepts 2.0.0**, requested by Express 5 in the pinned fixture.
The npm `latest` tag returned the older 1.3.8 line during the 2026-10-26
provenance check; this comparison uses the actual consumer version. There are
two direct dependencies and four total external dependencies: vnegotiator,
vcontent-type, vmime-types and vmime-db.
Counts are unchanged from the tested upstream graph, and the entire tree uses VPM.

## Validation and performance

```sh
node --test packages/vaccepts/test/*.test.cjs
bun test packages/vaccepts/test
node packages/vaccepts/bench/compare.cjs
bun packages/vaccepts/bench/compare.cjs
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
```

Eleven tests cover array/variadic calls, empty/missing headers, unknown extensions,
alias mapping, exclusions, parameter semantics, replacement headers, malformed
input, imports and 5,000 generated upstream comparisons. The shared HTTP
checks run with the VPM dependency replacements installed together. They
exercise Express `req.accepts`, `req.acceptsEncodings`, `req.acceptsCharsets`,
`req.acceptsLanguages`, and `res.format`, including 406 and Vary/Content-Type.
The archive gate checks npm/Bun installation, Node/Bun CJS/ESM imports and
TypeScript 7 consumers without Node or DOM types.

Sequential local run on Node 24.22.1 and Bun 1.4.0, 2026-10-26. Median
nanoseconds/call, seven alternating samples of 50,000 calls after warmup. The
harness checks equivalent results and consumes all returned values. Upstream
sources and dependencies are pinned; these are microbenchmarks, not application
throughput measurements.

| Case | Node: upstream → VPM | Bun: upstream → VPM |
| --- | ---: | ---: |
| Extension offers | 1,457 → 1,307 | 1,610 → 1,555 |
| Explicit media offers | 1,240 → 1,253 | 1,338 → 1,529 |
| Absent Accept | 25 → 210 | 13 → 228 |
| Quoted profile | 1,754 → 3,986 | 2,149 → 2,256 |
| Encodings | 629 → 867 | 563 → 734 |
| Languages | 906 → 966 | 1,054 → 841 |
| Charsets | 474 → 755 | 586 → 722 |

Extension matching improved modestly; language matching improved on Bun.
Validation removes upstream's unchecked absent-header shortcut, adding about
**185–215 ns/call** in that case. Quoted-profile selection took **127% longer on
Node**; encoding and charset cases took **23–59% longer** across the runtimes.
The underlying negotiator improves larger offer lists, but this wrapper's small
cases do not establish an overall application speedup.

Current shared coverage is recorded in the [central integration gate description](../../IMPROVEMENTS.md#the-integration-gate).

## Installation and provenance

No public registry release is claimed. Pack this package and its four dependency
packages with `bun pm pack --ignore-scripts`, then install the five archives
together. Bun also needs those local archive `file:` mappings in `overrides`
for unpublished transitive dependencies. The shared archive gate tests this
independently of workspace symlinks. Only implementation, declarations, README,
license and package metadata are shipped.

Derived from MIT-licensed accepts by Jonathan Ong and Douglas Christopher Wilson,
[2.0.0, commit e1c347e](https://github.com/jshttp/accepts/tree/e1c347ee7fa91a74f21484daefd805c0cdc4f949).
The unchanged npm source and license are retained under
`test/fixtures/accepts-2.0.0`, with source digests and npm integrity in
`test/fixtures/UPSTREAM.json`. The test-only baseline uses negotiator 1.1.0,
content-type 2.1.0, mime-types 3.0.2 and mime-db 1.54.0 fixtures. Tests and
benchmarks stay out of archives; this is not the complete upstream test suite.
