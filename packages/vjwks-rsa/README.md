# vjwks-rsa

Public signing-key retrieval for JWT consumers. A counterpart to `jwks-rsa`
3.2.2, using native crypto, a bounded private cache, shared in-flight retrieval,
and one direct runtime dependency: `vdebug`.

Node.js 24+ and Bun are supported. Performance comparisons target Node 24 and Bun.

The verified baseline remains **jwks-rsa 3.2.2**. Latest stable **4.1.0**, checked
October 30, 2026, is the next parity target: Firebase Admin 14.5.0 requires
`jwks-rsa ^4.0.1`. Version 4 behavior and Admin 14 callers are not yet verified.
See the [upgrade roadmap](../../IMPROVEMENTS.md#latest-stable-upgrade-roadmap).
The package includes CommonJS, native ESM imports and self-contained declarations.
The [repository comparison](../../IMPROVEMENTS.md#vjwks-rsa) and
[benchmark report](bench/results/README.md) record measured benefits and costs.

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
| `rateLimit` | `false` | Enforce an exact rolling-minute endpoint request limit. |
| `jwksRequestsPerMinute` | `10` | Maximum endpoint attempts in any rolling 60 seconds. |
| `getKeysInterceptor()` | None | Return raw JWKs or a promise for them. A missing match falls back to the endpoint. |

Options are snapshotted from own properties and frozen; reconfigure by creating a
new client. Numeric limits must be safe integers. Cache entries and requests per
minute are capped at one million; `maxKeys` has the same ceiling. Timeouts and
byte limits are capped at 2,147,483,647. Key IDs are limited to 1,024 characters;
individual encoded key fields are limited to 16,384 characters.

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

## Keys and compatibility

RSA, EC (P-256, P-384, P-521, secp256k1) and OKP (Ed25519, Ed448) public signing
keys are supported when the runtime can import them. Node 24 supports all these
families. Bun 1.4.0 rejects native secp256k1 and Ed448 JWK imports; those keys are
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
errors include `statusCode`. Native transport errors retain their original codes.

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
node --test packages/vjwks-rsa/test/jwks.test.cjs
bun test packages/vjwks-rsa/test/jwks.test.cjs
npm --prefix scripts/consumers ci --ignore-scripts
npm --prefix scripts/jwks-conformance ci --ignore-scripts
node scripts/jwks-conformance/run.cjs
bun scripts/jwks-conformance/run.cjs
node scripts/integration.cjs
bun scripts/integration.cjs
```

The 36 focused tests cover key imports and ambiguity, option snapshots, expiry,
rotation, rate limits, concurrent requests, callbacks, adapter failures and real
HTTP error lifecycles. All 88 pinned upstream JavaScript tests run on both
runtimes, with one documented timeout-code correction in the
[conformance fixture](../../scripts/jwks-conformance/README.md). Integration tests
exercise Firebase Admin's actual JWKS fetcher and signature verifier, plus
`vjsonwebtoken` key resolution. Archive gates check installed code and types.

[Provenance](PROVENANCE.json) identifies the pinned source and changes. The
upstream MIT [license](LICENSE) is preserved. Tests, comparison fixtures and
benchmark results are excluded from package archives.
