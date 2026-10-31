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
here), an HTTP/2 request to Node's HTTP/2 server (rejected with
`PROTOCOL_ERROR` upstream; under Bun, whose server accepts it, the malformed
`http:` value arrives instead), and the modules loaded by an app with Auth,
Firestore, Messaging and Storage.

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
