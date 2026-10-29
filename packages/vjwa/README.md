# vjwa

JSON Web Algorithm signing and verification using native crypto, with no external
runtime dependencies. Replaces `jwa` 2.0.1 beneath JWS/JWT consumers. Supports
Node.js 20+ and Bun; benchmarks target Node 24 and Bun.

```js
const jwa = require('vjwa')
const hmac = jwa('HS256')
const signature = hmac.sign('message', 'secret')
hmac.verify('message', signature, 'secret') // true
```

ES modules use `import jwa from 'vjwa'`. TypeScript declarations are included
and compile without ambient Node or browser types.

## Algorithms and API

`jwa(algorithm)` returns independent `{ sign, verify }` containers. Algorithm
names are exact and case-sensitive: `HS256/384/512`, `RS256/384/512`,
`PS256/384/512`, `ES256/384/512`, and `none`.

- `sign(input, key)` returns an unpadded base64url signature.
- `verify(input, signature, key)` returns a boolean. Malformed signature strings,
  wrong signatures and mismatched asymmetric key families/curves return `false`.
  Invalid argument types, key import failures and native crypto errors throw.
- `jwa('none')` explicitly selects an unsecured operation: signing returns `''`,
  and verification accepts only exactly `''`. It ignores input and key. No
  algorithm is selected automatically from untrusted data.

Strings and Buffers retain upstream behavior. Other ordinary values use
`JSON.stringify`; serialization errors propagate. ArrayBuffers and byte views
(including DataViews) are additionally accepted as exact bytes, honoring their
offset and length. Unlike upstream, typed arrays are not serialized as objects.

HMAC accepts string/byte secrets and genuine secret KeyObjects. RSA/ECDSA accepts
PEM strings or bytes and genuine asymmetric KeyObjects. Key-import options may
provide an own `key`, `format`, `type`, `passphrase` and `encoding` for encrypted
PEM, DER or JWK; supported fields are read once without modifying the options.
An options wrapper can also contain a KeyObject. Algorithm-specific padding,
salt length and signature format cannot be overridden through import options.

Extractable CryptoKeys are converted to native KeyObjects. Non-extractable
CryptoKeys are rejected instead of using the deprecated extraction path.
Conversion uses native key material semantics; WebCrypto usage/hash restrictions
are not applied after conversion. For repeated operations, prepare a KeyObject
once with `node:crypto` and reuse it.

## Validation and compatibility

- HMAC verification compares fixed-length canonical encoded signatures using
  native `timingSafeEqual`. The signature comparison is timing-safe; this is not
  a constant-time guarantee for key parsing, input validation or the whole API.
- Asymmetric signatures require canonical unpadded base64url, including zero
  unused bits and the expected byte length. Upstream's permissive decoding can
  accept alternate encodings. Invalid ECDSA lengths return `false` instead of
  throwing from the removed formatter.
- Signing requires the appropriate key family. ECDSA requires P-256, P-384 or
  P-521 for ES256, ES384 or ES512 respectively. Verification rejects mismatches.
  RSA-PSS always uses the digest length for its salt, with native key restrictions
  preserved. ECDSA uses native P1363 output directly, avoiding DER conversions.
- Native KeyObject metadata/options are prepared once per algorithm in WeakMaps.
  A separate FIFO cache holds at most 16 successfully parsed public PEM strings,
  each at most 16 KiB. Only complete `PUBLIC KEY`/`RSA PUBLIC KEY` strings qualify.
  Private PEM, mutable buffers, import options and certificates are not cached.
- Upstream's short HMAC secrets and RSA key sizes remain accepted when the
  runtime allows them. Key-strength policy, trusted algorithm selection, JWT
  claims, expiration, issuer and audience validation belong to callers.

Bun 1.4.0 does not import restricted `rsa-pss` keys; the native unsupported error
propagates, as it does upstream. PS256/384/512 with ordinary RSA keys is tested
on both runtimes. Bun also lacks secp256k1; it is not a supported JWA curve here.

## Verification and performance

The package has 38 focused tests plus 65 unchanged upstream tests run against
both the pinned original and VPM (168 test cases total). Coverage includes
OpenSSL interoperability, RFC 7515 Appendix A vectors, all 12 signing algorithms,
tampering, 1,800 malformed signature cases, key/import behavior, byte views and
public-key cache behavior. The upstream TAP runner and historical test helpers
are adapted to native APIs; on Bun, its unsupported secp256k1 wrong-key fixture
uses a still-wrong P-384 key. Original assertions are retained.

The repository integration gate substitutes `vjwa` beneath actual `jws`,
`jsonwebtoken` and Google `JWTAccess` callers. It checks all 12 JWT signing
algorithms, modified signatures and offline Google access-token signing.
Archive checks exercise npm/Bun installs, CJS/ESM and TypeScript consumers.

```sh
node --test packages/vjwa/test/*.test.cjs
bun test ./packages/vjwa/test/jwa.test.cjs ./packages/vjwa/test/upstream.test.cjs
OUTPUT=/tmp/vjwa-node.json node packages/vjwa/bench/compare.cjs
OUTPUT=/tmp/vjwa-bun.json bun packages/vjwa/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/vjwa-control.json node packages/vjwa/bench/compare.cjs
```

The [benchmark](bench/compare.cjs) alternates ten upstream/VPM pairs per workload.
It measures factory creation, signing, verification, mismatches and 64 KiB input,
with native KeyObjects and separate PEM cases. PEM verification measures a warm
public-key cache. Key generation/loading is excluded; private PEM parsing stays
inside timed signing. Separate Buffer and rotating-PEM cases measure uncached
verification. Identical-code controls measure harness variation. The
[eight raw reports](bench/results) retain every sample and source hash; reproduce
their paired summaries with `node packages/vjwa/bench/summarize.cjs` (add
`--verify-current` to check the current files against the recorded hashes).
Full measurements and limitations are recorded in the
[central comparison](../../IMPROVEMENTS.md#vjwa).

## Provenance

Derived from `jwa` 2.0.1 under [MIT](LICENSE).
[PROVENANCE.json](PROVENANCE.json) records upstream release integrity, source
commit and fixture hashes. Original dependency modules are retained only as
licensed test fixtures. Published RFC keys and generated synthetic test keys
are public fixtures, never credentials. Tests, keys and benchmarks are excluded
from installable package archives.
