# vjsonwebtoken

JSON Web Tokens built on `vjws` and `vms`, targeting the public API of
`jsonwebtoken` 9.0.3. Ten direct runtime dependencies become two. The transitive
cryptographic implementation is `vjwa`; Node's native crypto performs the signing.

```js
const jwt = require('vjsonwebtoken');
const { randomBytes } = require('node:crypto');
const key = randomBytes(32); // Keep and provision keys outside application source.
const token = jwt.sign({ sub: 'student' }, key, {
  algorithm: 'HS256', expiresIn: '2h', audience: 'ventimath', issuer: 'example'
});
const claims = jwt.verify(token, key, {
  algorithms: ['HS256'], audience: 'ventimath', issuer: 'example'
});
```

CommonJS and native ESM named/default imports are supported on Node 24+ and Bun.
The [declarations](index.d.ts) do not require ambient Node, Undici or DOM types.

## API

- `sign(payload, key, options?)` returns a compact token. A final callback receives
  `(error, token)` on the next tick. Object payloads acquire `iat` unless
  `noTimestamp` is true; `mutatePayload` explicitly writes generated claims back.
  String, number and byte payloads retain the legacy non-object behavior; claim
  options require an object. Byte views respect their offset and length.
- `verify(token, key, options?)` authenticates the signature and validates requested
  claims. A final callback receives `(error, payload)`. A key resolver
  `(header, done)` requires that final callback; it can resolve asynchronously.
  `complete: true` returns `{header, payload, signature}`. Resolver headers are
  untrusted, independent copies; resolver completion is accepted only once.
- `decode(token, options?)` decodes **untrusted** data. It does not authenticate
  signatures or enforce claims. Malformed compact input returns `null`; malformed
  JSON can throw. `complete: true` includes the header and signature. `json` and
  non-JSON text `encoding` follow `vjws`. The decoded payload's type is `unknown`.
- `JsonWebTokenError`, `TokenExpiredError` (`expiredAt`) and `NotBeforeError`
  (`date`) retain their names, inheritance and diagnostic fields.

Signing supports `algorithm`, `expiresIn`, `notBefore`, `audience`, `issuer`,
`subject`, `jwtid`, `keyid`, `header`, `encoding`, `noTimestamp`, `mutatePayload`
and `allowInsecureKeySizes`. Signing durations are integer seconds or `vms`
strings; a unitless string denotes **milliseconds**. NumericDate claims may be
fractional but must be finite numbers. Zero `iat` remains zero.

Verification supports an explicit `algorithms` array; audience strings, regular
expressions and arrays; issuer strings/arrays; subject, JWT ID and nonce matching;
`clockTimestamp`, non-negative `clockTolerance`, `maxAge`, `ignoreExpiration`,
`ignoreNotBefore` and `complete`. Time options use seconds except duration strings.
A zero clock and zero maximum age are enforced. Regex audience matching starts at
index zero for each candidate and preserves the caller's `lastIndex`.

HS/RS/PS/ES256, 384 and 512 are supported. Native KeyObjects, extractable CryptoKeys,
PEM strings/bytes and native asymmetric import options are accepted. Supported key
encodings depend on the runtime. Malformed PEM-looking key material is rejected.
Signing RSA requires at least 2048 bits unless
`allowInsecureKeySizes` is explicitly true. Key families, EC curves and restricted
RSA-PSS parameters must match the algorithm. Prefer explicit algorithm allowlists
and native KeyObjects when a key is already available in that form.

## Correctness and compatibility decisions

- Canonical compact encodings, header/algorithm agreement, UTF-8 verification
  payloads and critical-extension checks come from `vjws`. Unsupported critical
  extensions, unencoded payloads and detached signatures are rejected.
- All present `iat`, `exp` and `nbf` claims must be finite numbers, even when a
  time comparison is disabled. Invalid clocks/tolerances, malformed allowlists,
  sparse issuer arrays and invalid expected-claim types cannot silently disable
  checks. An explicitly requested empty issuer/subject/JWT ID is still checked.
- Object JSON always uses UTF-8. `encoding` applies to string payloads; byte
  payloads are not transcoded. The legacy binary encoding for object JSON is
  intentionally corrected. Invalid UTF-8 is rejected even without `typ: JWT`.
- Signing uses own properties and snapshots getters. Top-level payload `toJSON`
  methods are rejected, preventing a serialization hook from replacing validated
  claims. Prototype properties cannot supply claims or options. Boxed primitives
  are not accepted where options require strings, booleans or numbers.
- An explicit `options.algorithm` must agree with the serialized header. Signing
  `none` requires `algorithm: 'none'` and a null/undefined key; verification also
  requires an explicit allowlist containing `none` and no key. Disabling
  asymmetric key validation with `allowInvalidAsymmetricKeyTypes: true` is
  intentionally unsupported.
- Callback signing completes on the next tick, including validation errors.
  Callback verification with a direct key remains synchronous. Duplicate resolver
  completions are ignored; resolver throws are delivered as errors. Exceptions
  thrown by the caller's final callback propagate normally.
- Verification returns object claims or legacy text payloads; null, arrays and
  other JSON primitives marked as JWT payloads are rejected. Application-specific
  authorization and claim-schema checks remain the caller's responsibility.

## Implementation and evidence

Ordinary HMAC secrets go directly to native secret-key import, avoiding a failed
asymmetric import on every operation. Inputs containing PEM markers still go
through native asymmetric parsing, so public keys cannot become HMAC secrets.
Callback signing uses one in-memory operation without stream collectors.

A private cache holds at most 16 complete public PEM strings, each at most 16 KiB.
Private PEM, certificates, secrets, import-option objects and mutable buffers are
never cached by input identity. Immutable native key metadata is held weakly;
shadowed native fields are rejected. These caches do not retain decoded claims.

The [focused tests](test/jwt.test.cjs) cover all 12 signed algorithms, exact claim
boundaries, malformed tokens, key confusion, callback lifecycle, mutable buffers,
Unicode, byte views, CryptoKeys and prototype/getter behavior. The
[pinned upstream suite](../../scripts/jwt-conformance/README.md) runs 512 cases:
512 pass on Node; 509 pass on Bun with three restricted-RSA-PSS import cases
marked pending. Eleven corrected expectations and the enabled upstream unsigned
callback case are documented in [provenance](PROVENANCE.json). The
[consumer integration gate](../../scripts/integration.cjs) also exercises
Firebase/Google authentication callers with the VPM implementation substituted.

The [benchmark harness](bench/compare.cjs) compares upstream, upstream using
`vjws`/`vms`, and `vjsonwebtoken`. See [results](bench/results/README.md) and the
[central comparison](../../IMPROVEMENTS.md#vjsonwebtoken) for gains, remaining
regressions, runtime versions, controls and reproducible measurements. Benchmarks
measure operations, not application throughput.

Source is derived from Auth0's `jsonwebtoken` under the [MIT license](LICENSE).
[Provenance](PROVENANCE.json) records pinned source verification and test changes.
