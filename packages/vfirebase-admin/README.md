# vfirebase-admin

**Implementation status:** VPM independently implements app and credential
management and the Auth operations used by VentiMath. It also owns HTTP transport,
responses, retries, authorization, Firestore client configuration and Storage
contexts. Endpoint schemas, remaining service APIs and Google Auth remain
upstream-derived. This is a partial SDK rewrite;
[provenance](PROVENANCE.json) maps the boundary.

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

- **Per-client Storage context.** Credential and project come from one app-options
  snapshot, including an explicit project with application-default credentials.
  Emulator configuration is passed to each client instead of writing
  `STORAGE_EMULATOR_HOST`. Changing the environment later cannot redirect an
  existing client's metadata, Firebase download URLs or signed-form routes.
  Metadata and uploads honor the same explicit endpoint. Named buckets check app
  lifetime without copying all options. Underlying Storage operations remain
  separately tracked in `vgoogle-cloud-storage`.

- **Firestore client configuration.** Each database has one owned client/settings
  record. Mutating the original `preferRest` option cannot disguise a conflicting
  later initialization. Settings getters are captured once, and project identity
  and credentials come from the same app-options snapshot. Failed construction
  leaves no cached client. Database identity, project precedence and lazy client
  loading remain compatible. Firestore operations still use the separately
  tracked, upstream-derived `vgoogle-cloud-firestore` runtime.

- **Owned HTTP response projection.** The raw body is read once, so text and JSON
  cannot describe different reads of a changing transport record. Header records
  and array values are detached. Parsed values and failures are private: setting
  an unrelated property cannot replace the JSON result or disguise a parse error.
  JSON scalar values, parsed-object identity, raw text and diagnostic causes remain
  compatible. Native error construction preserves `RequestResponseError`
  subclasses. Diagnostic request references retain identity; this is not a deep
  freeze of returned JSON or headers. Multipart and raw-HTTP helpers remain retained.

- **HTTP/1 request lifecycle.** URL, headers and body bytes are prepared once,
  so changing caller input cannot change a retry's request. Header names are
  compared without case, preserving an explicit `Content-Type`. Truncated
  responses and invalid compressed bodies reject instead of remaining pending;
  failures destroy their streams and release buffered chunks. Completed error
  responses keep connections reusable. Gzip/deflate coding is case-insensitive,
  and Brotli responses are decoded. Response projection and the
  retry policy are independently implemented.

- **HTTP/2 request lifecycle.** Requests reuse the captured URL, header and
  payload plan across attempts. Caller pseudo-headers cannot override the planned
  method, scheme or path; mixed-case content types do not create duplicate fields.
  A close before response headers, aborted/error streams and invalid compressed
  responses settle as errors. Only the failed stream is destroyed, leaving its
  batch session available unless the peer violates the connection protocol.
  Gzip/deflate coding is case-insensitive and Brotli is decoded. Wire byte counts
  enforce `Content-Length` even on Bun, where the original accepts mismatched
  bodies; HEAD and 304 representation lengths are handled separately. Common
  JSON/text response projection is independently implemented. Session generations own their
  diagnostics: late events cannot contaminate a later batch, destroyed sessions
  are recreated, repeated close calls are coalesced, and reading errors cannot
  erase the stored list. A failed connection creation allows another attempt.

- **Authorization header ownership.** HTTP/1 and HTTP/2 share one preparation
  path. Transport options and header values are captured before token acquisition,
  including copies of array-valued headers. The acquired bearer token wins over
  every spelling of `Authorization`; duplicate casing cannot substitute a stale
  credential. Explicit quota and metrics headers are recognized without case.
  Prototype-named headers remain data, caller records remain unchanged, and app
  deletion is checked after token acquisition. Auth/message operation builders
  own request bodies; this adapter handles transport options and headers.

- **Owned retry policy.** Each client captures its retry settings and arrays;
  later caller mutations cannot change an in-flight budget. Counts/delay limits
  must be nonnegative safe integers and the backoff factor must be finite.
  Retry-After accepts complete decimal seconds or HTTP dates, including the two
  obsolete date forms interpreted in UTC. Junk suffixes, impossible dates and
  numeric prefixes are not accepted as delays. An explicit zero is honored;
  valid excessive delays stop retries when they exceed the configured budget.
  Header names are case-insensitive. Long timer waits use bounded segments so
  native timer overflow cannot turn a long delay into an immediate attempt.

- **Auth request ownership and resource identity.** JSON-shaped input is copied
  before project lookup, so asynchronous discovery and validation cannot mutate
  the caller's data or send later edits. Each request owns its headers. Resource
  identifiers are encoded separately from endpoint templates; slashes, query
  delimiters and replacement-string syntax cannot alter the resource structure.
  Dot-segment identifiers and malformed Unicode are rejected. Concurrent project
  discovery shares one operation and failures allow retry. Malformed server
  codes and non-JSON error bodies produce Auth errors with response context.
  Endpoint schemas remain upstream-derived.

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
  also validates any unlink list. Endpoint schema validation and MFA conversion remain upstream-derived.

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
previous JWT improvements; they do not isolate the HTTP rewrite alone. The
[full report](bench/results/README.md) includes all forty-five cases, process
orders, identical-source controls and raw samples, including regressions and
inconclusive comparisons.

Storage's application-default context takes 2.1 µs versus 3.8 µs on Node (45%
less median paired time). Default bucket access costs 3% (10.3 versus 10.0 µs);
service-account setup and explicit bucket access are inconclusive. All four Bun
Storage comparisons are inconclusive. These include the underlying Storage client.

Firestore repeated initialization takes 13 ns versus 18 ns on Node (28% less
median paired time) and 9 ns versus 17 ns on Bun (47% less). Bun's cached lookup
takes 10 ns versus 9 ns (+18% paired time); Node's cached lookup and both option
projection comparisons are inconclusive. These measure the Admin accessor and
configuration work, not Firestore operations or RPC latency.

The response-only JSON case eagerly parses and consumes the value inside timing.
JSON, malformed-JSON diagnostics and empty-response classification are all
inconclusive on both runtimes in this recording. Raw costs, earlier recordings
in Git history, and the source-matched controls remain available.

The HTTP cases serialize requests and consume synthetic response streams; they
exclude sockets and network latency. HTTP/1 with Auth-style headers costs about
31% on Bun and is inconclusive on Node. HTTP/2 single requests and twenty-request
batches are inconclusive on Node; on Bun they cost 41% and 39%, respectively
(3.7 versus 2.7 µs, and 63.0 versus 45.9 µs). Node's synthetic session setup costs
110% (226 versus 106 ns); Bun's is inconclusive. These are not real FCM batch
latencies. Authorized requests retain costs too: explicit headers cost 28% on
Node, while Bun's default/explicit cases cost 38% and 56%. Node's default-header
comparison is inconclusive.

Custom retry-policy capture takes 113 ns versus 10 ns on Node and 374 ns versus
12 ns on Bun; it copies and freezes caller settings instead of retaining them.
Default construction takes 9 ns versus 14 ns and 7 ns versus 18 ns, respectively.
Strict UTC HTTP-date parsing costs 466 ns versus 241 ns on Node and 432 ns versus
42 ns on Bun. Setup/error-path regressions retain their full percentages and
controls; ordinary request success does not parse retry dates.

Token verification, record serialization and concurrent acquisition have separate
cases. Record construction, cached-key reads, app/credential setup and cleanup
also retain costs or inconclusive differences, depending on runtime and case.
The lookup/update dispatch cases stop before HTTP, and the planning-only cases
bypass endpoint dispatch entirely. Local server fixtures verify correctness and
wire compatibility; these CPU timings do not establish application latency.

## Evidence

- [Upstream suite](../../scripts/firebase-admin-conformance/README.md): the
  release's 6,146 unit tests pass for the original. VPM runs the 6,062 that do not
  require the Realtime Database client; all pass except 47 that assert the
  `https:` scheme, multipart parsing or global Storage emulator mutation, each
  required to fail on its exact recorded assertion.
- [Callers](../../scripts/firebase-admin-conformance/callers.cjs): `verifyIdToken`
  with revocation checks, `getUser`, `updateUser`, `revokeRefreshTokens`,
  `deleteUsers` (Auth emulator protocol), a full Firestore scenario (gRPC),
  `save`, `exists`, `delete` and signed URLs (Storage JSON API) and
  `sendEachForMulticast` (FCM over HTTP/2), against local servers. Requests and
  results are identical to the original's.
- [Regressions](../../scripts/firebase-admin-conformance/regressions.cjs): each
  fix above reproduced with the original, then checked here.
- [Storage context controls](../../scripts/firebase-admin-conformance/storage-context.cjs)
  compare two real server destinations, metadata/uploads/download URLs, V2/V4
  signatures, ADC projects, captured options and deleted-app access.
- [Firestore configuration controls](../../scripts/firebase-admin-conformance/firestore-facade.cjs)
  reproduce mutable settings and inconsistent option reads, and verify database
  identity and retry after failed construction.
- [Response controls](../../scripts/firebase-admin-conformance/http-response.cjs)
  compare 24 normal and real HTTP outcomes, then reproduce changing body reads,
  aliased headers, exposed parse-state mutation and erased error subclasses.
- [HTTP/2 controls](../../scripts/firebase-admin-conformance/http2-transport.cjs)
  compare retry bytes, actual wire headers, compressed bodies, no-header closures,
  peer resets, content-length mismatches, timeouts and usable batch sessions.
  Synthetic controls inspect pseudo-header overrides and aborted/error ordering.
  [Session controls](../../scripts/firebase-admin-conformance/http2-session.cjs)
  reproduce diagnostics crossing generations, error-array mutation and recovery.
- [Authorization controls](../../scripts/firebase-admin-conformance/authorized-headers.cjs)
  reproduce duplicate-casing overrides and pending option/header mutations for
  both clients, then verify the HTTP/1 wire result and retained deletion checks.
- [Retry controls](../../scripts/firebase-admin-conformance/http-retry.cjs)
  compare normal budgets and actual HTTP retries, then reproduce mutable policy,
  numeric-prefix, timezone and timer-overflow failures in the original adapter.
- [HTTP controls](../../scripts/firebase-admin-conformance/http-transport.cjs)
  compare retry bytes, header casing, partial responses, compression failures,
  timeouts and connection reuse against the original on local servers.
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
