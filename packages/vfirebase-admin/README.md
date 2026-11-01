# vfirebase-admin

**Implementation status:** app registration, service lifetime, token refresh
ownership and option snapshots now use a VPM redesign. Credential provider
adapters, Auth and the other service implementations remain upstream-derived;
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

The isolated measurements include the redesigned app layer. Setup and teardown
still cost more: Node context creation/read takes about 338 ns versus 195 ns,
repeated initialization 849 ns versus 575 ns, and disposal of three services
1.16 µs versus 0.48 µs. The service-lookup case rotates through three services
so it cannot collapse to one constant result. Concurrent forced refreshes use
one credential acquisition instead of twenty; the benchmark uses a synthetic
provider and does not measure network latency. Full results and controls are
linked below.

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
- [App lifecycle controls](../../scripts/firebase-admin-conformance/app-lifecycle.cjs)
  reproduce the original token, ownership, cleanup and option-copy defects in
  isolated processes.
- [Focused tests](test/firebase-admin.test.cjs) and [type tests](test/types.ts).
- [Measurements](bench/results/README.md), with controls and source hashes.

Apache-2.0 licensing, the pinned source and the files changed from it are
recorded in [PROVENANCE.json](PROVENANCE.json).
