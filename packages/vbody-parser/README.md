# vbody-parser

JSON, URL-encoded form, text and raw-body middleware for Node.js HTTP servers and
Express-style applications. Requires Node.js 20+ or Bun. CommonJS, native ESM
default/named imports, and self-contained TypeScript declarations are included.

```js
const bodyParser = require('vbody-parser');

app.use(bodyParser.json({ limit: '100kb' }));
app.use(bodyParser.urlencoded({ extended: true, parameterLimit: 1000, depth: 32 }));
```

The four factories are also available as `vbody-parser/json`, `/raw`, `/text`,
and `/urlencoded`. Calling the old generic `bodyParser()` factory throws.
This package is available in the VPM workspace and through archives, not the
npm registry. Pack it and its VPM dependencies with `bun pm pack`, then install
the archives together with npm or Bun.

## API

Each factory returns `(request, response, next) => void` middleware. A matching
body is read once, parsed into `request.body`, and followed by `next()`.
Errors go to `next(error)`. Requests with no body framing, an unmatched media
type, or an already-finished body are skipped; an existing body is preserved.

| Factory | Default media type | Result |
| --- | --- | --- |
| `json(options)` | `application/json` | Parsed JSON; empty body becomes `{}`. |
| `urlencoded(options)` | `application/x-www-form-urlencoded` | Form fields; empty body becomes `{}`. |
| `text(options)` | `text/plain` | Decoded string. |
| `raw(options)` | `application/octet-stream` | Buffer, with no charset decoding. |

Common options:

- `limit`: nonnegative safe integer bytes or a complete `vbytes` size string.
  Omission or `null` means **100 KiB**, including for compressed requests.
  The limit counts inflated bytes before charset decoding. Infinity is rejected.
- `type`: a media type, extension such as `'json'`, wildcard such as `'text/*'`
  or `'+json'`, nonempty array of these, or synchronous request predicate.
  String patterns are case-insensitive and arrays are copied at construction.
- `inflate`: boolean, default `true`. Supports gzip, deflate and Brotli, plus
  Zstandard when the runtime provides `createZstdDecompress`. With `false`,
  compressed bodies are rejected. Stacked content encodings are unsupported.
- `verify(req, res, buffer, encoding)`: optional synchronous verification hook
  after inflation and before charset decoding/parsing. The Buffer contains the
  inflated original bytes; encoding is the chosen charset, or `null` for raw.
  Throw to reject. Explicit `false` disables verification.
- `defaultCharset`: nonempty charset name, default `'utf-8'`. Used when the
  Content-Type has no charset; ignored for raw decoding. Text supports the
  `viconv-lite` codec catalog; JSON accepts supported `utf-*` names; forms accept
  only `'utf-8'` and `'iso-8859-1'`.

JSON also accepts `strict` (boolean, default `true`, allowing only objects and
arrays) and a native `JSON.parse` `reviver` function. `strict: false` permits
scalar JSON values. Omit a reviver instead of passing `null`.

Forms also accept:

- `extended`: boolean, default `false`; enable nested object/array fields.
- `parameterLimit`: positive safe integer or Infinity, default 1000.
- `depth`: nonnegative safe integer or Infinity, default 32. Validated even
  when `extended` is false; effective nesting depth is zero in that mode.
- `charsetSentinel` and `interpretNumericEntities`: booleans, both default false;
  retain the `vqs` UTF-8 sentinel and Latin-1 numeric-entity behavior.

These callbacks are synchronous; returned Promises are not awaited. Options
are validated and snapshotted at factory construction. Application timeouts,
schema validation and handling of parsed data remain the caller's responsibility.
Multipart parsing is outside this API. Keep finite form bounds for untrusted
input; Infinity does not remove JavaScript memory or recursion limits.

## Errors and stream ownership

Errors carry `status`, `statusCode`, `expose`, and relevant metadata. Common
`type` values include `entity.parse.failed` (400), `entity.verify.failed` (403),
`entity.too.large` (413), `parameters.too.many` (413),
`querystring.parse.rangeError` (400), `charset.unsupported` (415),
`encoding.unsupported` (415), and `request.aborted` (400).
Byte-count and stream-state failures come from [vraw-body](../vraw-body).

Errors thrown by predicates, verifiers and parsers are wrapped, with the
original thrown value retained as `cause`. Valid custom HTTP statuses and
error types survive; frozen errors and primitive throws are supported.
The middleware does not mutate the original error. Parse/verify failures also
include the decoded text or verification Buffer as `body`.
On Bun and Node versions with native stack accessors, the original stack is
resolved and cached on first access to the wrapper's `stack`. This avoids
unnecessary or repeated formatting while retaining the
original trace, writable stack overrides, and a
captured wrapper trace when the original stack is not a string. Error logging
that reads `stack` still performs the necessary formatting. Changes to the
original stack before its first read are visible; later changes do not alter the
cached wrapper stack.
Older Node/V8 versions that materialize stack descriptors eagerly retain a
single eager copy, avoiding a second formatting cost on those runtimes.

Compressed reads observe abort/error/premature-close events on the original
request and stop the owned decoder. Readers attach before piping begins, and
completion detaches the middleware's listeners and its specific decoder pipe.
Read failures drain an open request before forwarding the error; aborted or
destroyed requests settle immediately. Unsupported charset/encoding failures
occur before reading and leave disposition of the unread request to the caller.
The middleware does not destroy the application-owned request socket.

## Compatibility and improvements

The baseline is **body-parser 2.4.0**, used by the repository's Express 5.3.0 /
Functions Framework 5.0.2 consumer fixture.

- Form parameter limits no longer wrap through a signed 32-bit conversion.
  For example, `parameterLimit: 2 ** 32` correctly retains `a=1&b=2`.
- Configuration rejects malformed/coercible limits, booleans, media patterns,
  charsets and revivers early. Later option/array mutation cannot alter a parser.
- An interrupted compressed request cannot leave the decoder waiting for input
  from a request that has already closed.
- Callback failures retain their original error and metadata as described above.
  Legacy error-object identity and exact stack/message normalization are not
  preserved. Strict JSON scalar rejection now has the explicit message
  `JSON body must be an object or array`, without allocating a placeholder body.
- Every external runtime dependency is a VPM counterpart. Direct dependency
  count remains nine; the complete external tree contains fifteen packages.
- Only the four documented parser subpaths are exported; upstream's internal
  `lib/*` wildcard is intentionally excluded.

Direct dependencies are `vbytes`, `vcontent-type`, `vdebug`, `vhttp-errors`,
`viconv-lite`, `von-finished`, `vqs`, `vraw-body` and `vtype-is`. Their remaining
dependencies are `vms`, `vstatuses`, `vee-first`, `vmedia-typer`, `vmime-types`
and `vmime-db`. These improvements do not establish production performance
gains or the existence of an upstream security vulnerability.

## Verification and measurements

From the repository root:

```sh
node --test packages/vbody-parser/test/*.test.cjs
bun test packages/vbody-parser/test/body.test.cjs
npm run typecheck
npm --prefix scripts/consumers ci --ignore-scripts
node scripts/integration.cjs
bun scripts/integration.cjs
node scripts/check-media-archives.cjs
node packages/vbody-parser/bench/compare.cjs
bun packages/vbody-parser/bench/compare.cjs
node packages/vbody-parser/bench/errors.cjs
bun packages/vbody-parser/bench/errors.cjs
```

Focused tests cover all four parsers, option snapshots, form bounds, compressed
byte limits, charsets, frozen/primitive callback errors, real client disconnects,
listener cleanup and exports. Differential middleware tests use immutable,
hash-checked upstream source with VPM primitives to isolate middleware behavior.
The HTTP benchmark instead uses the **complete stock dependency tree** from
the locked consumer fixture. The shared [integration gate](../../IMPROVEMENTS.md#the-integration-gate)
substitutes this package into real Express and Functions Framework callers.
Archive checks install with both package managers, exercise CJS/ESM on both
runtimes, and compile TypeScript consumers without ambient Node, Undici or DOM types.

See [the central comparison](../../IMPROVEMENTS.md#vbody-parser) for dated HTTP
measurements, raw samples and the limitations of those measurements.

## Provenance and license

Derived from [body-parser 2.4.0](https://github.com/expressjs/body-parser/tree/b4744d739e1e2e5257f2ddac31eed191aa5152a4),
by Jonathan Ong, Douglas Christopher Wilson and contributors, under MIT.
[PROVENANCE.json](PROVENANCE.json) records the source archive, integrity, source
hashes and changes. VPM modifications copyright 2026 VentiMath. Original notices
are retained in [LICENSE](LICENSE). Tests and benchmarks are excluded from archives.
