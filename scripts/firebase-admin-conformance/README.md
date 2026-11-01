# Firebase Admin conformance

Baseline: **firebase-admin 14.5.0**, the npm tarball recorded in the package
[provenance](../../packages/vfirebase-admin/PROVENANCE.json), checked October 31,
2026. The release's unit tests and test resources (`test/unit`,
`test/resources`), manifest and license from the `v14.5.0` tag (commit
`50ab2502c1faaf0685891ee5087a20dfd20eba2a`) are retained under `upstream/`
(TypeScript files use a `.txt` suffix to avoid root test discovery) and verified
against `SHA256.json` before execution. Test tools are pinned at the versions in
the release's own lockfile.

```sh
npm --prefix scripts/firebase-admin-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/firestore-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/firebase-admin-conformance/run.cjs --upstream
node scripts/firebase-admin-conformance/run.cjs
node scripts/firebase-admin-conformance/regressions.cjs
node scripts/firebase-admin-conformance/callers.cjs
```

Repeat with Bun.

`messaging-send.cjs` runs each implementation in a separate process. Twenty-four
normal send/multicast outcomes match, including token/FID recipients, dry-run
requests, APNs/data payloads and ordered partial failures. Additional controls
reproduce own-constructor/null-prototype payload aliases, prototype writes,
sparse-batch aggregation crashes, duplicate project lookups and unused HTTP/2
sessions. They verify encoded project identity, lookup recovery, result order and
session closure. Dispatch is synthetic in these ownership controls; `callers.cjs`
separately exercises the real local FCM HTTP/2 exchange. No assertion in the
retained 511-test Messaging suite is edited or newly exempted.

`messaging-response.cjs` compares 63 normal response/error projections and
reproduces false successful deliveries, malformed-detail crashes and prototype-
named code failures in the original. Both client runtimes use a separate Node 24
HTTP/1 and HTTP/2 server for ordered normal/malformed batches. HTTP/2 normalizes
only the original's already-documented trailing scheme colon, as in `callers.cjs`.
Single-send placeholder results and legacy topic semantics remain compatible;
per-device batch success is stricter. All 519 selected Messaging/error tests and
full suites retain their expected results. Empty suite filters now fail explicitly.

`run.cjs` compiles the tests with the workspace TypeScript 7 compiler (no type
checking) into upstream's layout, with `src` linked to the implementation's
`lib` and its `package.json` beside them, and runs `test/unit/index.spec`, the
entry of upstream's `test:unit` script, with Mocha. For VPM the tests'
`google-auth-library` import resolves to `vgoogle-auth-library`; their
`jsonwebtoken` import stays the original's, because the tests use it as a tool to
mint tokens (passing an empty-string key for unsigned emulator tokens, which
`vjsonwebtoken` rejects by design).

The original passes all **6,146 tests** on Node. VPM runs 6,062: the two
Realtime Database spec files (the 84 tests of the `Database` suite) are left out
because the implementation they require is omitted. Exactly 47 VPM tests must
fail, each on a recorded assertion:

- 39 `Http2Client` and `AuthorizedHttp2Client` tests assert the request carried
  `:scheme: https:`; VPM sends the bare `https` that RFC 9113 requires.
- One Storage test requires writing `STORAGE_EMULATOR_HOST` globally. VPM passes
  the emulator to each client instead. `storage-context.cjs` verifies preserved
  routing and isolation through two actual local servers.
- 7 tests expect multipart responses to be parsed; VPM rejects them with
  `ERR_UNSUPPORTED_MULTIPART_RESPONSE`. (The eighth multipart test, an
  `Http2Client` one, fails first on its `:scheme` assertion.)

On Bun both libraries also fail the same 15 tests (16 for the original, which
still runs the `Database` suite's) that match V8's wording for assigning to a
getter-only property; Bun throws the same `TypeError` as "Attempted to assign to
readonly property".

`regressions.cjs` runs each case in a fresh process per library: concurrent
public-key fetches for ID-token certificates and JWKS (20 requests upstream, 1
here), an HTTP/2 request from each runtime to a Node HTTP/2 server (rejected with
`PROTOCOL_ERROR` upstream), and the modules loaded by an app
with Auth, Firestore, Messaging and Storage.

`callers.cjs` drives the Admin APIs VentiMath's backend calls, through each
library in its own process, against local servers: the Auth emulator protocol
(`verifyIdToken` with and without revocation checks, `getUser`, `updateUser`,
`revokeRefreshTokens`, `deleteUsers`), the [Firestore fixture](../firestore-conformance/README.md)'s
gRPC server and scenario, a Cloud Storage JSON API (`save` with checksum
validation, `exists`, `delete`, v2 signed URLs) and FCM over HTTP/2
(`sendEachForMulticast` with one unregistered token). The FCM server is Node's
HTTP/2 server, so the original's `:scheme` value is normalized in transit for
both libraries. Request logs (with the current time in `validSince` and the
emulator port normalized) and results must be identical.

The percent-condition distribution cases use the same 100,000 deterministic
IDs (`vpm-percent-condition-0` through `vpm-percent-condition-99999`) for
upstream and VPM. The retained source still uses random UUIDs; the runner
changes only that expression in its temporary compiled test copy. Hashing,
sample sizes and all original tolerances remain unchanged. This avoids a
correct upstream control randomly falling outside its three-standard-deviation
bound and makes differences reproducible. Filtered runs also fail on unexpected
assertion failures.

`app-lifecycle.cjs` runs original and VPM controls in disposable processes. It
covers forced-refresh coalescing, synchronous credential failure/retry, invalid
expiry and token redaction, local registry ownership, same-name imposters,
prototype-named services, concurrent/failed cleanup and app-option prototype
pollution. VPM also checks deep/null-prototype options, cycle rejection and
initializer recovery. Run it with Node 24 or Bun; the package test invokes it.

`credentials.cjs` isolates original/VPM controls for agent-sensitive factory
identity, frozen and mutated credential inputs, file snapshots/rotation, shared
discovery/acquisition, validated token projections, retry, cache eviction and
JSON error redaction. `credential-transport.cjs` redirects only the OAuth request
destination to a local server: RSA signing, token request bodies, Gaxios,
configured HTTP Agent selection and response conversion run normally. The
server verifies the signature and both JWT/refresh-token forms. Both scripts
run on Node 24 and Bun through the package tests; no live credentials are used.

`user-records.cjs` compares 160 generated user/provider/metadata/MFA projections
and isolates the original serializer's prototype writes and constructor-key
aliasing. VPM preserves those claim keys, detaches nested outputs and supports
20,000-level claim data on Node and Bun; Node's original serializer overflows
its stack on that case. Cycles report an explicit error. The unchanged upstream
record suites also run within the full Admin gate.

`user-operations.cjs` compares lookup, updates, revocation and batch deletion
through local Auth HTTP servers, including partial deletion failures. Separate
controls reproduce changed-array counts, sparse-list successes for unsent UIDs,
invalid/duplicate response indices, constructor-key mutation, frozen structural
inputs, prototype writes and linking/unlinking validation. Oversized arrays are
rejected before copying; custom iterators cannot substitute different UIDs.
The package tests run these controls on Node 24 and Bun. The 166 unchanged
upstream user-management tests also run as part of the complete Admin suite.

`token-verification.cjs` signs tokens with the retained public test-fixture key
and supplies its public key through each SDK's normal key-fetch adapter. Twelve
valid/error outcomes match, including real RSA verification, tampering, unknown
keys, expiry, disabled users and revocation. Controls reproduce ID/session subject
exemptions, malformed legacy-token/audience TypeErrors, nonnumeric authentication
times and mutation during revocation lookup. Blocking events retain their subject
exemption. A direct comparison control checks an invalid user-record timestamp;
normal UserRecord projection still follows its existing date-normalization contract.
No live token service or credentials are involved; accepting a locally
signed malformed token is not evidence of signature forgery. The 228 unchanged
upstream verifier/verification tests run within the complete Admin gate.

`key-verification.cjs` serves actual certificate and JWKS responses locally.
Controls reproduce mutable cached keys, quoted/malformed max-age producing NaN
expiry, ignored age/no-cache/no-store, and lost `__proto__` key IDs. The new cache
keeps immutable snapshots, retries failures and does not retain noncacheable
results. Signed no-key-ID tokens verify normally with RS256; RS512 is rejected
by the same allowlist as the ordinary path, where upstream's fallback accepts it.
A counting fetcher verifies one acquisition instead of two. The unchanged 110
upstream JWT/key-fetch tests also run within the complete gate.

The HTTP/2 regression control uses `http2-server.cjs` under Node 24 for both
client runtimes, as the caller fixture does. Bun 1.4 on macOS accepts the
original malformed `:scheme: http:` value; using that server cannot establish
protocol rejection. The shared Node server rejects upstream and observes VPM's
correct `http` value. The client implementation under test remains unchanged.

`auth-requests.cjs` checks normal and tenant URLs, endpoint query masks, real
Auth emulator requests and response errors on Node 24 and Bun. Original controls
reproduce resource structure changes from unencoded names, replacement-string
substitution, input/header mutation, repeated concurrent project discovery and
malformed error-code TypeErrors. VPM snapshots JSON-shaped input, encodes resource
identity once, owns each header record and returns Auth errors with the original
response context. Lookup failures allow retry. The 296 unchanged upstream
request-handler tests run within the full Admin suite. Tenant/provider controls
exercise the shared builder; they do not expand VentiMath's application scope.

`http-transport.cjs` uses actual local HTTP/1 requests on both runtimes. It
reproduces changed payloads/headers on retry, ignored Content-Type casing, and
pending promises after truncated bodies or invalid gzip. A bounded observation
period distinguishes an unresolved original promise from VPM's settled error.
Both clients also check normal gzip/deflate, timeouts, configured agents and
keep-alive reuse after a complete 503 response. VPM handles case-insensitive
coding and Brotli. The retained HTTP/1/authorized suite runs 93 tests: 89 pass,
with the same four exact multipart differences. The new stream lifecycle follows
[Node 24's response/error event contract](https://nodejs.org/docs/latest-v24.x/api/http.html#httprequestoptions-callback).


The independent retry policy is covered by `http-retry.cjs` on Node 24 and Bun.
Each process loads one implementation. Original controls reproduce mutable
configuration, nonfinite/fractional limits, numeric-prefix parsing, ignored zero
and mixed-case delays, local-time interpretation of obsolete asctime dates, and
native timer overflow. The HTTP-date tests use an explicit non-UTC timezone;
long timer tests record scheduled segments without actually waiting days. A
local HTTP server verifies the complete retry path. Date/seconds grammar follows
[RFC 9110 sections 5.6.7 and 10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after),
including obsolete date formats and the two-digit-year rule. JSON/text response projection uses the independent response adapter.


`authorized-headers.cjs` compares captured request options and header values
across delayed token acquisition for both HTTP clients. Original controls show
case-duplicate Authorization overriding the acquired token, case-sensitive quota
and metrics replacement, lost prototype-named header data and post-call mutation.
A real HTTP/1 server confirms credential/quota/metrics wire values. The HTTP/2
header boundary is inspected before transport because upstream's malformed
`:scheme` prevents the ordinary Node wire request; the separate actual FCM
caller verifies the corrected VPM HTTP/2 transport. App deletion after token
acquisition still rejects. These controls concern authorization/options/headers;
Auth and message operation builders own request bodies.


`http2-transport.cjs` runs original and replacement clients separately against
one Node HTTP/2 server implementation. For these comparisons only, the original
request's known scheme colon is normalized; `regressions.cjs` still checks it
without adaptation. Controls cover stable JSON/Buffer retry payloads and array
headers, exact wire fields, content-type casing, gzip/deflate/Brotli, closes before
headers, invalid gzip, genuine peer destruction, truncated/excess bodies, HEAD/304,
timeouts and reusable sessions. Connection-fatal malformed data is checked last,
without promising reuse after the peer violates the protocol. Bun's original
client accepts content-length mismatches; the replacement validates wire bytes.
A synthetic stream deterministically exercises aborted/error ordering and inspects
pseudo-header precedence before native normalization. Request option getters are
read once and prototype-named header data is preserved.

All 88 unchanged upstream HTTP/2/authorized-client tests still run. Their 39
scheme assertions stop before later fields, so their exact expected failures do
not establish those later assertions; the actual wire controls supply that
coverage. No upstream assertions or mock events are changed. The lifecycle uses
[Node 24's HTTP/2 stream contract](https://r2.nodejs.org/docs/latest-v24.x/api/http2.html#class-http2stream)
and [RFC 9113 request control fields](https://www.rfc-editor.org/rfc/rfc9113.html#section-8.3.1).

`http2-session.cjs` supplies deterministic session test doubles to each SDK
in separate processes. It checks ordinary diagnostic text and reproduces late
errors entering a new session, erased error arrays, destroyed-session reuse,
repeated close and lost diagnostics after failed connection creation. The
replacement uses one record per native connection and returns detached error
arrays. Actual FCM caller tests also exercise its normal native lifecycle.

`http-response.cjs` compares 24 normal and real HTTP outcomes in isolated original
and VPM processes on Node 24 and Bun. Object/scalar JSON, invalid/empty text,
HTTP error context, original parse-error causes and parsed-object identity remain
compatible. Controls reproduce different body reads, aliased header records and
arrays, mutation of exposed parsing state and erased error subclass prototypes.
The adapter captures and owns response data; multipart/raw-HTTP helpers remain
retained. The package test runs this control without changing upstream assertions.

`firestore-facade.cjs` isolates the original and VPM client registries. Changing
previously supplied settings can disguise a conflicting initialization upstream;
the replacement retains the exact value used by its client. Getter controls also
verify that project and credential come from one options snapshot and that
settings are read once. Distinct database identity, cached reuse, and retry after
a failed constructor remain compatible. Actual Firestore RPCs are verified by
`callers.cjs`; this facade rewrite does not replace the underlying client runtime.

`storage-context.cjs` runs each implementation in its own process with two local
HTTP servers. It reproduces global emulator leakage between apps, an explicit
endpoint overriding uploads but not metadata, and ambient changes redirecting
Firebase download URLs or changing signed-form bucket routes. V2/V4 URLs and an
independently verified V4 form signature preserve normal behavior. Controls also
cover ADC project selection, one app-options snapshot, canonical default endpoint
authentication classification, and access after app deletion. The original test
requiring global mutation remains unchanged and must fail on precisely its
recorded assertion. No other upstream test is adapted for this change.
