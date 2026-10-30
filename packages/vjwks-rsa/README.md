# vjwks-rsa

Public signing-key retrieval for JWT consumers. A counterpart to `jwks-rsa`
4.1.0, using native crypto, a bounded private cache, shared in-flight retrieval,
and one direct runtime dependency: `vdebug`.

Node.js 24+ and Bun are supported. Performance comparisons target Node 24 and Bun.

The current target is **jwks-rsa 4.1.0**, including opt-in stale-key fallback.
Both its upstream suite and Firebase Admin **14.5.0** token callers are verified,
with retained 3.2.2 / Admin 12.7.0 coverage. The latest version was checked
October 30, 2026. This is package compatibility evidence; SDK installation and
application adoption remain separate steps.
The package includes CommonJS, native ESM imports and self-contained declarations.
The [repository comparison](../../IMPROVEMENTS.md#vjwks-rsa) and
[benchmark report](bench/results/4.1.0/README.md) record measured benefits and costs.

## Usage

```js
const jwks = require('vjwks-rsa');
const client = jwks({
  jwksUri: 'https://issuer.example/.well-known/jwks.json',
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});
const key = await client.getSigningKey('key-id');
const pem = key.getPublicKey();
```

`getSigningKey(kid, callback)` also supports `(error, key)` callbacks. The method
is bound to its client, and callbacks always run asynchronously. `getKeys()`
returns the endpoint's raw key array; `getSigningKeys()` imports the supported
public signing keys. `jwks.JwksClient` exposes the same constructor.

Key records are immutable and expose `kid` and `alg` when present, plus
`publicKey`, `rsaPublicKey` and `getPublicKey()`. All three PEM accessors share one
lazy export. Returned arrays are independent; raw JWK objects from `getKeys()`
remain mutable. The positive cache holds imported records, not raw responses.

This package retrieves keys. The JWT verifier remains responsible for signature,
issuer, audience, expiry and other claim checks. Configure a trusted endpoint and
the verifier's expected algorithms independently of untrusted token contents.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `jwksUri` | Required unless `fetcher` is supplied | HTTP(S) endpoint, without credentials or fragment; query strings are preserved. |
| `fetcher(uri)` | Native HTTP(S) request | Return `{ keys: [...] }` or a promise for that object. Without a URI, the argument is `undefined`. |
| `requestHeaders` | None | Own string-valued headers, copied and validated at construction. |
| `requestAgent` | Native default | Node HTTP(S) Agent, or `false`; proxy transport belongs in the Agent. |
| `timeout` | `30000` ms | Total deadline for each HTTP fetch, custom fetcher, or interceptor invocation; `0` disables it. |
| `maxResponseBytes` | `1048576` | Maximum bytes collected by the native HTTP transport. |
| `maxKeys` | `100` | Maximum raw keys per endpoint response or interceptor result. |
| `cache` | `true` | Cache successful `getSigningKey` lookups. |
| `cacheMaxEntries` | `5` | Maximum cached lookup IDs; `0` disables caching. |
| `cacheMaxAge` | `600000` ms | Fixed lifetime since insertion, using a monotonic clock; `0` disables caching. |
| `cacheMaxAgeFallback` | `0` (off) | Extra lifetime after `cacheMaxAge` during an endpoint failure; requires a nonzero enabled cache. |
| `onStaleCacheFallback(error, kid, key)` | None | Notification for each stale result; thrown errors and rejected promises reject the lookup. |
| `rateLimit` | `false` | Enforce an exact rolling-minute endpoint request limit. |
| `jwksRequestsPerMinute` | `10` | Maximum endpoint attempts in any rolling 60 seconds. |
| `getKeysInterceptor()` | None | Return raw JWKs or a promise for them. A missing match falls back to the endpoint. |

Options are snapshotted from own properties and frozen; reconfigure by creating a
new client. Numeric limits must be safe integers. Cache entries and requests per
minute are capped at one million; `maxKeys` has the same ceiling. Timeouts and
byte limits are capped at 2,147,483,647. Key IDs are limited to 1,024 characters;
individual encoded key fields are limited to 16,384 characters. The sum of fresh
and fallback cache lifetimes must also be a safe integer.

Concurrent `getSigningKey` and `getSigningKeys` calls share one endpoint fetch and
import while it is pending, even for different IDs. Failures are not cached.
Completed key sets are not cached as a whole: subsequent uncached IDs refetch to
permit rotation. `getKeys()` is a direct raw fetch and does not participate in
coalescing. The limiter counts actual endpoint attempts, including direct
`getKeys()` and `getSigningKeys()` calls; cache and interceptor hits are free.
It rejects immediately when full and never queues delayed retries.

Native HTTP rejects redirects, non-2xx status codes, premature close, oversized
bodies and invalid UTF-8/JSON. A streaming response cannot extend its deadline.
Custom fetchers supply already-parsed objects, so transport byte/UTF-8 limits are
their responsibility. A timeout rejects the caller but cannot cancel a custom
fetcher or interceptor that does not provide cancellation.

## Optional outage fallback

`cacheMaxAgeFallback` preserves an already retrieved key for a bounded extra
window after its normal cache lifetime. This trades freshness for availability:
a rotated or revoked key can remain trusted during an outage until that window
ends. The default is off. Firebase Admin 14.5.0 disables this package's cache and
uses its own six-hour cache, so this option does not change that caller's policy.

Each expired lookup attempts a refresh. Only an endpoint transport failure,
HTTP error, timeout, or custom-fetcher rejection permits stale fallback.
Malformed or oversized responses, invalid key sets, absent IDs, interceptor
failures and local rate limits fail closed. An endpoint refresh that fails without an outage
removes that ID's old cached entry. Stale reads do not restart the original monotonic
deadline or become fresh cache hits, and each successful fallback invokes the
notification hook. Concurrent refreshes still share one pending request.

This fixes a reproduced 4.1.0 behavior where a stale result is cached as fresh,
allowing use past the documented fallback deadline and suppressing further
notifications during that fresh period. VPM uses one bounded cache for both
fresh and stale records, rather than a second stale-key store.

## Keys and compatibility

RSA, EC (P-256, P-384, P-521, secp256k1) and OKP (Ed25519, Ed448) public signing
keys are supported when the runtime can import them. Node 24 supports all these
families. secp256k1/ES256K is a retained extension beyond upstream 4.1,
which removed it when moving to JOSE 6. Bun 1.4.0 rejects native secp256k1 and Ed448 JWK imports; those keys are
skipped, with explicit capability tests. Symmetric, private and encryption keys
are excluded. Encodings must be canonical unpadded base64url; curve coordinates
must have the correct length. `key_ops`, when provided, must be `['verify']`.
An explicit `alg` must agree with the key family. Malformed or unsupported entries
are skipped without discarding valid siblings.

Duplicate IDs among usable signing keys reject the key set rather than choosing
an arbitrary key. Empty-string IDs are preserved and matched exactly. A missing
or null lookup ID selects a key only when there is exactly one usable key.
PEM text uses native SPKI export; on Bun this includes a trailing newline that
upstream's WebCrypto path omits, with identical encoded key bytes.
Upstream's incidental acceptance of non-string IDs, ambiguous IDs, mutable cache
records, inherited configuration, invalid limits and noncanonical fields is not
preserved. An explicit obsolete `proxy` option is rejected. Zero cache age means
no cache, unlike upstream's nonexpiring interpretation.

The exported errors are `ArgumentError`, `JwksError`, `JwksRateLimitError` and
`SigningKeyNotFoundError`. Deadline failures use `code: 'ETIMEDOUT'`; HTTP status
errors include `statusCode`. Endpoint failures expose `isEndpointUnavailable: true`;
invalid documents and local policy errors do not. Native transport errors retain
their original codes. Frozen custom-fetcher errors are wrapped with their cause.

## Middleware adapters

The familiar helpers remain exported:

- `expressJwtSecret(options)`: modern Promise and legacy four-argument callbacks.
- `passportJwtSecret(options)`: `(request, compactJwt, callback)`.
- `koaJwtSecret(options)`: Promise-based header resolver.
- `hapiJwt2Key(options)` and `hapiJwt2KeyAsync(options)`: callback resolver and
  Promise returning `{ key }`.

Adapters require the token's algorithm to agree with the selected key. Supported
algorithms are RS256/384/512, PS256/384/512, ES256/256K/384/512 and EdDSA. An omitted
JWK `alg` permits the matching family; an explicit one restricts it to that value.
Passport checks compact structure and UTF-8 JSON header/payload objects before
fetching. It rejects critical extensions and unencoded payloads; it does not
verify the signature itself.

Express and Passport's `handleSigningKeyError(error, done)` hooks must call `done`
to complete successfully; thrown errors and rejected promises are propagated.
Repeated completion is ignored. Their default missing-key result supplies no key.
Hapi uses the same hook contract but requires a real key to report success;
failure callbacks receive `(error, null, null)`. Koa's hook receives the error and
may throw or return a replacement error, synchronously or asynchronously. It
cannot manufacture a successful key. Callback exceptions are not caught and
reported a second time.

## Verification

From the repository root:

```sh
node --test packages/vjwks-rsa/test/*.test.cjs
bun test packages/vjwks-rsa/test
npm --prefix scripts/consumers ci --ignore-scripts
npm --prefix scripts/jwks-conformance ci --ignore-scripts
node scripts/jwks-conformance/run.cjs
bun scripts/jwks-conformance/run.cjs
node scripts/jwks-conformance/callers.cjs
bun scripts/jwks-conformance/callers.cjs
node scripts/jwks-conformance/regressions.cjs
bun scripts/jwks-conformance/regressions.cjs
```

All **47 focused tests** pass on both runtimes, covering key imports, option
snapshots, cache/fallback expiry, rotation, rate limits, concurrency, adapters,
notification failures and real HTTP error lifecycles. The upstream suites run
**96 current** and **88 legacy** JavaScript cases on each runtime, against VPM
and unmodified upstream controls, without skips. The sole expectation adaptation
is the request timeout code; the [fixture guide](../../scripts/jwks-conformance/README.md)
records the exact sources and commands.

Real Firebase Admin 14.5.0 callers verify RSA and EC signatures, unknown/missing
IDs, invalid signatures, expiry, cache reuse, rotation/removal and outage recovery.
Its App Check verifier also checks signed claims and maps rejection errors.
Import/call counters prove VPM is exercised. Firebase Auth's certificate endpoint
path does not use JWKS and is outside this comparison. The existing integration
gate retains Admin 12.7.0 and `vjsonwebtoken` key resolution. Installed npm/Bun
archive gates check CommonJS, ESM and TypeScript 7 declarations.

[Provenance](PROVENANCE.json) identifies the pinned source and changes. The
upstream MIT [license](LICENSE) is preserved. Tests, comparison fixtures and
benchmark results are excluded from package archives.
