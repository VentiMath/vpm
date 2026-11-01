# vfirebase-admin

**Implementation status:** app registration, service lifetime, token refresh
ownership, option snapshots, credential adapters, Auth response records,
user-management plans, token policy, key caching, signature adaptation and Auth
request dispatch use VPM redesigns. Google Auth, the generic HTTP client and other service implementations
remain upstream-derived. This is not yet a completed SDK rewrite. [Provenance](PROVENANCE.json) records
the boundary.

The Firebase Admin SDK, targeting **firebase-admin 14.5.0**, the latest stable
release checked October 31, 2026. All dependencies are VPM packages; Node.js 24+
and Bun.

```js
const {initializeApp} = require('vfirebase-admin/app');
const {getAuth} = require('vfirebase-admin/auth');
const {getFirestore, FieldValue} = require('vfirebase-admin/firestore');
const {getMessaging} = require('vfirebase-admin/messaging');

const app = initializeApp();
const {uid} = await getAuth(app).verifyIdToken(idToken, true);
await getFirestore(app).doc(`users/${uid}`).set({seen: FieldValue.serverTimestamp()}, {merge: true});
await getMessaging(app).sendEachForMulticast({tokens, notification: {title: 'Practice set ready'}});
```

The package targets 14.5.0's entry points (`/app`, `/auth`,
`/firestore`, `/storage`, `/messaging`, `/app-check`, `/functions`,
`/remote-config`, `/security-rules` and the rest), options, environment
variables and emulator support, in CommonJS, native ES modules and TypeScript.
Admin 14 provides the modular API only: `admin.firestore()`,
`admin.messaging()`, `admin.apps` and the `admin.firestore.FieldValue`-style
namespaces, still present in 13.x, were removed upstream in 14.0.

| Upstream dependency | Here |
| --- | --- |
| `@google-cloud/firestore` ^9 (optional) | [`vgoogle-cloud-firestore`](../vgoogle-cloud-firestore/README.md) |
| `@google-cloud/storage` ^8 (optional) | [`vgoogle-cloud-storage`](../vgoogle-cloud-storage/README.md) |
| `google-auth-library` ^11, `jsonwebtoken` ^9, `jwks-rsa` ^4 | `vgoogle-auth-library`, `vjsonwebtoken`, `vjwks-rsa` |
| `fast-deep-equal` | App-option comparison is internal |
| `@firebase/database-compat`, `@firebase/database-types` | Omitted (see below) |
| `@fastify/busboy` | Omitted (see below) |

## Changes from 14.5.0

- **Auth request ownership and resource identity.** JSON-shaped input is copied
  before project lookup, so asynchronous discovery and validation cannot mutate
  the caller's data or send later edits. Each request owns its headers. Resource
  identifiers are encoded separately from endpoint templates; slashes, query
  delimiters and replacement-string syntax cannot alter the resource structure.
  Dot-segment identifiers and malformed Unicode are rejected. Concurrent project
  discovery shares one operation and failures allow retry. Malformed server
  codes and non-JSON error bodies produce Auth errors with response context.
  Endpoint schemas and the generic authorized HTTP client remain upstream-derived.

- **Owned signing keys and freshness.** Certificate and JWKS caches publish
  immutable snapshots. Prototype-named key IDs remain own data. Concurrent
  refreshes share pending work, and failures allow retry. Certificate freshness
  handles quoted and case-insensitive `max-age`, subtracts response age, and
  honors `no-cache`/`no-store`. Malformed or duplicate directives cannot produce
  `NaN` or infinite cache lifetimes. Noncacheable snapshots are not retained.
  The cache uses explicit response freshness only, without heuristic freshness
  or conditional revalidation; JWKS retains the six-hour SDK policy.
- **Consistent signature routing.** Tokens without a key ID use one key fetch
  and stop at the first valid signature. Every public-key path enforces RS256
  or ES256; upstream's no-ID fallback also accepts other RSA algorithms.
  Emulator verification remains a separate unsigned-token path.

- **Auth verification policy.** Token-kind checks, per-call project resolution
  and signature verification form separate stages. A blocking-event claim cannot
  exempt ID tokens or session cookies from their required user subject. Malformed
  legacy-token or audience shapes produce `FirebaseAuthError`, avoiding accidental
  `TypeError` failures. Revocation captures the authentication time before user
  lookup and requires a finite numeric `auth_time` when comparing it with the
  user's revocation timestamp; the comparison also rejects an invalid record timestamp.
  These changes follow the [ID-token contract](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
  and [revocation model](https://firebase.google.com/docs/auth/admin/manage-sessions).
  The controls use locally signed fixture tokens; they do not demonstrate an
  ability to forge Google's signatures. Crypto and key retrieval use the
  VPM JWT adapter over `vjsonwebtoken` and `vjwks-rsa`.

- **Auth user-management plans.** `getUser`, `updateUser`,
  `revokeRefreshTokens` and `deleteUsers` use owned request plans. Update inputs
  are detached before normalization, including structural class instances and
  records with own `constructor` or `__proto__` keys. Frozen inputs remain usable.
  Deletion counts belong to the submitted batch, so changing the caller's array
  cannot change the result. Oversized batches are rejected before copying;
  sparse lists reject invalid UIDs rather than reporting unsent users as deleted.
  Error indices must be unique integers within the batch. Linking a provider
  also validates any unlink list. The generic HTTP client, endpoint schema
  validation and MFA conversion remain upstream-derived.

- **Auth response records.** User, provider, timestamp and MFA records use
  explicit field projections. Serializing JSON-shaped claims preserves own
  `__proto__` and `constructor` keys without changing `Object.prototype` or
  returning aliases to the original claims. Nested JSON data in TOTP output is detached too;
  its public getter retains upstream's identity contract. A bounded shallow walk with an iterative
  fallback handles deeply nested records and reports cycles explicitly.
  Malformed MFA collections must be arrays.

- **Credential transport and identity.** Factories distinguish HTTP agents and
  pass them through to JSON auth clients. Validated credential data is detached
  before use: frozen camel-case objects work, and changing a file/object after
  construction cannot silently change the authentication identity. A new factory
  call observes rotated file contents.
- **Bounded credential storage.** Certificate and refresh-token factories retain
  at most 64 entries per agent and credential kind, using digest keys. Agents
  are weakly held. An evicted credential can be recreated by a later factory
  call; object identity is not permanent across eviction. ADC remains cached
  per agent.
- **Credential acquisition.** Concurrent calls share client discovery and token
  acquisition; failures can be retried. Project/email lookup memoization also
  retains an absent email. Token results expose only `access_token` and
  `expires_in`, with nonempty tokens and finite positive expiry. Malformed-file
  errors keep a sanitized SyntaxError without quoting credential contents.

Credential inputs are plain, acyclic JSON records with up to 64 nested
containers. Functions and conflicting snake/camel aliases are rejected. Explicit
constructors validate their credential kind; the legacy `refreshToken` tag is
normalized to `authorized_user`. Google Auth's underlying providers are still
upstream-derived and tracked separately.

- **Owned app and service lifetimes.** Registries cannot delete a different
  instance with the same name. Prototype-named services work. Concurrent app
  deletion shares cleanup; every existing service is visited even when another
  cleanup fails, and no service can be created after closing begins.
- **Recoverable token refresh.** Forced refreshes share one pending acquisition.
  Synchronous credential errors reject normally and can be retried. Expiry must
  be finite and positive, tokens non-empty, and malformed-token errors omit the
  response contents. Provider errors retain their existing message and cause.
- **Detached configuration.** Iterative snapshots preserve own `__proto__` keys
  without modifying prototypes, copy null-prototype records and support deep
  options. Cycles are rejected explicitly. Credential/agent class instances
  retain identity; custom conversion hooks are not used for option equality.
  Environment JSON can start with whitespace.

- **No Realtime Database.** `vfirebase-admin/database` throws a descriptive
  error on import. Upstream's entry point wraps `@firebase/database-compat`;
  with `@firebase/database-types` that is 14 installed packages, including a
  websocket stack, which no VPM caller uses. Every
  other entry point is unaffected: the database client was only loaded by that
  entry point.
- **No multipart parsing.** Upstream parses `multipart/mixed` responses with
  `@fastify/busboy` into a response whose `text` and `data` throw, and no Admin
  14 API requests or reads one. Such a response fails here with
  `ERR_UNSUPPORTED_MULTIPART_RESPONSE`.
- **One key request at a time.** While the public keys are missing or expired,
  upstream starts a separate key request for every concurrent token
  verification: ID tokens and session cookies (Google certificates), App Check
  and phone-number verification (JWKS). A cold Cloud Functions instance serving
  concurrent requests fetches the certificates once per request. Here concurrent
  callers share the request in flight; a failed request is retried by the next
  caller.
- **Valid HTTP/2 requests.** Upstream sends FCM requests with `:scheme: https:`;
  RFC 9113 requires the bare scheme, and conforming HTTP/2 servers such as
  Node's reject the stream. Google's front end accepts both; here the value is
  `https`.
- **Token verification dependencies.** Signature verification and decoding use
  `vjsonwebtoken`. Current CPU comparisons use isolated Node 24 and Bun workers
  with identical-source controls. The measurements cover local CPU work and
  synthetic credential providers. Two full ID-token cases include claim checks
  and real RSA verification; one includes a synthetic revocation lookup. Certificate
  retrieval and application request latency are excluded.
- **Declarations without Node types.** Public declarations compile without
  ambient Node types; `Buffer` is Node's `Buffer` where Node types are loaded,
  and `httpAgent` accepts any Node `http` or `https` `Agent`.

Missing-dependency errors name the VPM packages.

The isolated measurements compare the full VPM stack with upstream, including
previous JWT improvements; they do not isolate this request rewrite alone.
On Node, ID-token verification takes about 28 µs versus 48 µs, with a median
paired change of -42%; adding a synthetic revocation lookup gives -36%.
No-key-ID verification also gives -36%. The complete update path, including
resource construction, request snapshots and schema validation, takes about
6.5 µs versus 7.0 µs (-7%). These directions hold beyond the observed control
spread in every comparison pair. The complete lookup comparison is inconclusive.

Bun's signature/token comparisons and the complete lookup/update comparisons
are inconclusive in this recording: some pairs reverse and identical-source
controls show substantial variation. Those samples remain in the report; earlier
recordings' speed claims are not substituted for these results.

Cached certificate reads cost about 81 ns versus 70 ns on Node and 50 ns versus
43 ns on Bun. Record construction retains a regression on both runtimes (median
paired changes of +6% on Node and +24% on Bun, with wide Bun variation).
User-record serialization still takes less time. Update planning and 100-user
batch deletion, measured separately with dispatch bypassed, remain inconclusive.
App/credential setup and service cleanup also retain regressions; concurrent
acquisition benefits from sharing pending work.

The [full report](bench/results/README.md) includes all twenty-three cases,
process orders, controls and raw samples. These measure local CPU work;
HTTP dispatch cases use synthetic responses and exclude network latency.

## Evidence

- [Upstream suite](../../scripts/firebase-admin-conformance/README.md): the
  release's 6,146 unit tests pass for the original. VPM runs the 6,062 that do not
  require the Realtime Database client; all pass except 46 that assert the
  `https:` scheme or multipart parsing, each required to fail on exactly that.
- [Callers](../../scripts/firebase-admin-conformance/callers.cjs): `verifyIdToken`
  with revocation checks, `getUser`, `updateUser`, `revokeRefreshTokens`,
  `deleteUsers` (Auth emulator protocol), a full Firestore scenario (gRPC),
  `save`, `exists`, `delete` and signed URLs (Storage JSON API) and
  `sendEachForMulticast` (FCM over HTTP/2), against local servers. Requests and
  results are identical to the original's.
- [Regressions](../../scripts/firebase-admin-conformance/regressions.cjs): each
  fix above reproduced with the original, then checked here.
- [Request controls](../../scripts/firebase-admin-conformance/auth-requests.cjs)
  reproduce URL substitution, request mutation and malformed error handling,
  including actual local HTTP requests and responses on both runtimes.
- [Key/cache controls](../../scripts/firebase-admin-conformance/key-verification.cjs)
  exercise actual HTTP certificate/JWKS responses, expiry, immutable key maps,
  prototype-named IDs, and signed no-key-ID verification against the original.
- [Token-policy controls](../../scripts/firebase-admin-conformance/token-verification.cjs)
  compare twelve locally signed outcomes and exercise ID/session/blocking subject
  handling, malformed claims, signature failures and revocation input ownership.
- [User-operation controls](../../scripts/firebase-admin-conformance/user-operations.cjs)
  compare normal and partial-failure HTTP requests/results, then reproduce batch
  mutation, sparse-input, invalid-index and input-ownership defects.
- [User-record controls](../../scripts/firebase-admin-conformance/user-records.cjs)
  compare 160 generated responses and isolate prototype, aliasing and deep-data
  cases against the original on both runtimes.
- [Credential controls](../../scripts/firebase-admin-conformance/credentials.cjs)
  and [local OAuth transport](../../scripts/firebase-admin-conformance/credential-transport.cjs)
  verify the credential changes against the original, including actual signed
  JWT and refresh-token POSTs through the configured agent.
- [App lifecycle controls](../../scripts/firebase-admin-conformance/app-lifecycle.cjs)
  reproduce the original token, ownership, cleanup and option-copy defects in
  isolated processes.
- [Focused tests](test/firebase-admin.test.cjs) and [type tests](test/types.ts).
- [Measurements](bench/results/README.md), with controls and source hashes.

Apache-2.0 licensing, the pinned source and the files changed from it are
recorded in [PROVENANCE.json](PROVENANCE.json).
