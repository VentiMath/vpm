# vraw-body

Read a Node.js byte stream into a Buffer or decoded string, validate its byte
length and limit, and reliably settle the read on completion or failure.
Requires Node.js 24+ or Bun. CommonJS and native ESM default imports are supported.

```js
const getRawBody = require('vraw-body');

const body = await getRawBody(request, {
  length: request.headers['content-length'],
  limit: '100kb',
  encoding: 'utf8',
});
```

This package is available in the VPM workspace and through package archives.
It is not published to the npm registry. Pack this package and its VPM dependencies
with `bun pm pack`; install their archives together using npm or Bun.

## API

`getRawBody(stream, [options], [callback])` returns a Promise when no callback is
provided. The callback receives `(null, body)` on success or `(error, undefined)`
on failure. Callback delivery preserves the async context of registration.
Initialization errors are delivered asynchronously; malformed arguments and
options throw synchronously in both APIs, before reading or attaching listeners.

- `length`: expected bytes, as a nonnegative safe integer or a string of ASCII
  decimal digits. Omit or use `null` when unknown. Leading zeroes are accepted.
- `limit`: nonnegative bytes, or a complete size string accepted by `vbytes`,
  such as `'100kb'` or `'1.5mb'`. Omit, use `null`, or use `Infinity` (or any
  number beyond the safe integer range) for no limit. A fractional numeric limit
  uses its integer part, which is how raw-body's comparison behaves.
- `encoding`: a `viconv-lite` encoding name; `true` means UTF-8. Omission, `null`
  or `false` returns a Buffer. A string or `true` can replace the options object.

Limits and lengths always count input bytes, including when returning a string.
The caller controls the read timeout and should set a suitable limit for untrusted
bodies. The result Buffer has independent storage; emitted input chunks must
remain unchanged until the read completes. All VPM codec aliases, streaming
decoders and BOM behavior are retained.

The source must implement the modern Node readable-stream methods `on`,
`removeListener`, `unpipe` and `pause`, and emit Buffer or Uint8Array chunks.
Do not call `setEncoding` on the source. WHATWG streams and raw-body 4's
`getRawBodyWeb`/custom decoder API are outside this package's current API.

## Errors and ownership

Own listeners and retained body data are cleared on every completion. Errors
unpipe and pause the stream, preserving the caller's ability to send an HTTP
response. The caller remains responsible for draining or destroying the source.
The package does not destroy the request socket or remove unrelated listeners.

| Type | Status | Meaning |
| --- | --- | --- |
| `entity.too.large` | 413 | Declared or received bytes exceed the limit. |
| `request.size.invalid` | 400 | Received bytes differ from the expected length. |
| `request.aborted` | 400 | Abort or close before completion; `code` is `ECONNABORTED`. |
| `encoding.unsupported` | 415 | Unknown decoder name. |
| `stream.encoding.set` | 500 | The source already has an encoding or emits strings. |
| `stream.not.readable` | 500 | The source has ended, closed or been destroyed. |
| `stream.chunk.invalid` | 500 | The source emits another non-byte value. |

Errors carry `status`, `statusCode`, `type` and relevant `limit`, `received`,
`expected`, `length` or `encoding` fields. Source and decoder exceptions retain
their identity and may lack HTTP metadata; the declarations reflect that.

## Compatibility and improvements

The compatibility target is **raw-body 3.0.2**, used by body-parser 2.4.0 in the
Express 5.3.0 / Functions Framework 5.0.2 consumer fixture. As checked on
2026-10-26, raw-body 4.0.0 is available; it requires Node 22+, changes the CommonJS
entry point and uses TextDecoder by default. It is outside body-parser's declared
3.x range. Comparisons here concern 3.0.2, not every current upstream release.

- A premature close rejects instead of leaving the callback or Promise pending.
- A body exceeding its declared length fails as soon as the excess arrives.
- Malformed lengths, and malformed, negative or NaN limits, fail explicitly.
  Invalid values cannot silently disable limits or length checks.
- Decoder exceptions and invalid chunks enter the normal cleanup/error path.
- Listener registration rolls back on failure or reentrant completion. Callback
  async resources are explicitly destroyed, even when the callback throws.
- Modern stream methods replace `unpipe` and its Node 0.8 compatibility logic.
  Three direct dependencies are all VPM packages: `vbytes`, `vhttp-errors` and
  `viconv-lite`. Including `vstatuses`, the complete external tree has four packages.
- Buffer assembly reuses the recorded byte count without an extra counting pass,
  while preserving independent result storage.
- The hot path uses one native Uint8Array check (including Buffer), validates
  numeric limits once, and compares received bytes against a precomputed bound.
  Strict string parsing, early length rejection, and limit-error precedence remain.

Intentional differences include strict options/encoding types, removal of old
EventEmitter-only streams and string chunks, earlier rejection of oversized
declared bodies, and the new premature-close/chunk errors. No application-wide
speedup or security outcome is inferred from these changes.

## Verification and provenance

Run from the repository root:

```sh
node --test packages/vraw-body/test/*.test.cjs
bun test packages/vraw-body/test/body.test.cjs
node packages/vraw-body/bench/compare.cjs
bun packages/vraw-body/bench/compare.cjs
npm run typecheck
node scripts/integration.cjs
node scripts/check-media-archives.cjs
```

For a same-run comparison with the initial VPM implementation:

```sh
git show 5873356:packages/vraw-body/index.js > /tmp/vraw-body-before.cjs
node packages/vraw-body/bench/compare.cjs --baseline /tmp/vraw-body-before.cjs
bun packages/vraw-body/bench/compare.cjs --baseline /tmp/vraw-body-before.cjs
```

This compares upstream, the previous VPM source and the current implementation,
rotating their execution order. The previous VPM source resolves the same VPM
dependencies as the current source. The dated results in `bench/` record fresh
process measurements, runtime versions and source hashes.

Tests compare successful Buffer/string, callback/Promise and encoding behavior
against an immutable upstream fixture, then exercise documented differences,
real file streams, byte boundaries, failure cleanup, and async context. The
integration gate aliases vraw-body into real HTTP consumers on Node and Bun.
Installed-archive checks cover both package managers, both module systems and
TypeScript 7 consumers without ambient Node/DOM types. The async_hooks destruction
assertion runs on Node; Bun does not implement those hooks.

[Central improvements](../../IMPROVEMENTS.md#vraw-body) records measured results
and tradeoffs. The benchmark measures whole PassThrough reads with alternating
samples, rather than treating an asynchronous call as completed work.

Based on [raw-body 3.0.2](https://github.com/stream-utils/raw-body/tree/4cf8e0a2591802e01f05f93e39a6a5b3610a183c),
MIT licensed, copyright Jonathan Ong and Douglas Christopher Wilson. Original
notices are preserved in LICENSE. `test/fixtures/UPSTREAM.json` records source
hashes and npm archive integrity. The comparison loader reuses pinned upstream
bytes 3.1.2, http-errors 2.0.1 (its modern branches), iconv-lite 0.7.3 and unpipe
1.0.0; no VPM implementation enters that baseline. Fixtures and benchmarks are
excluded from installable archives.
