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
because the implementation they require is omitted. Exactly 46 VPM tests must
fail, each on a recorded assertion:

- 39 `Http2Client` and `AuthorizedHttp2Client` tests assert the request carried
  `:scheme: https:`; VPM sends the bare `https` that RFC 9113 requires.
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
