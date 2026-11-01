# vfirebase-admin

**Implementation status:** app registration, service lifetime, token refresh
ownership, option snapshots, credential adapters and Auth response records use VPM redesigns.
Google Auth, Auth service methods and the other service implementations remain upstream-derived;
this is not yet a completed SDK rewrite. [Provenance](PROVENANCE.json) records
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

- **Auth response records.** User, provider, timestamp and MFA records use
  explicit field projections. Serializing custom claims preserves own
  `__proto__` and `constructor` keys without changing `Object.prototype` or
  returning aliases to the original claims. Nested TOTP output is detached too;
  its public getter retains upstream's identity contract. A bounded shallow walk with an iterative
  fallback handles deeply nested records and reports cycles explicitly.
  Malformed MFA collections must be arrays. Auth request and token-verification
  implementations remain upstream-derived.

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
  synthetic credential providers, excluding certificate retrieval, claim and
  revocation checks, and application request latency.
- **Declarations without Node types.** Public declarations compile without
  ambient Node types; `Buffer` is Node's `Buffer` where Node types are loaded,
  and `httpAgent` accepts any Node `http` or `https` `Agent`.

Missing-dependency errors name the VPM packages.

The isolated measurements include the redesigned app, credential and Auth record
layers. User-record serialization takes about 213 ns versus 319 ns on Node
(33% less time) and 266 ns versus 489 ns on Bun (45% less time), beyond the
observed identical-source control spread in every comparison pair. Node record
construction still costs more: 4.79 µs versus 4.31 µs. The Bun construction
comparison has no established direction at the recorded precision.

App/credential setup, some cached acquisitions and service cleanup also retain
regressions; concurrent acquisition benefits from sharing pending work. The
[full report](bench/results/README.md) includes all fifteen cases, process orders,
controls and raw samples. These measure local CPU work, excluding network latency.

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
