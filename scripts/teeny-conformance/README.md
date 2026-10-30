# Teeny request conformance

Development-only controls for **teeny-request 11.1.1**. The published package,
Mocha, Sinon and Nock are pinned in the lockfile; none ships in VPM archives.
The original sources, three test files and Apache license are retained from
googleapis/google-cloud-node commit
`72f2e23f1f1a035d85edf1b218948d365aa0bb7f`, tag `teeny-request-v11.1.1`.
`run.cjs` verifies [SHA-256 hashes](upstream/SHA256.json) before transpilation
with TypeScript 7. Type declarations have separate strict checks.

The suite has **116 active cases and two upstream skips**. Many upstream tests
return before their callback or stream assertions execute. The harness waits
for those assertions before teardown and propagates their failures. It also
unwraps the proxy constructor exports in the upstream test imports and destroys
pooled sockets during cleanup. No active assertions are removed.

Bun's Nock HTTPS interception requires explicit protocol metadata for object
request options. The harness supplies it to both implementations. Focused real
HTTP/TLS/proxy tests and SDK callers run without this mocking adaptation.

VPM passes all 116 active cases on Node 24 and Bun. The published control passes
116 on Bun and **114 on Node**: the Node transport uses node-fetch 3's different
JSON error message and `gzip, deflate, br` negotiation, while its tests expect the
older strings. The runner requires exactly those two Node control failures.
These are upstream test/transport mismatches, not evidence of broken JSON or
gzip operation. Both skipped multipart statistics tests remain skipped because
their fixtures also mismatch the request method; VPM's real-network tests cover
string-only multipart completion and failure directly.

`callers.cjs` uses the separately locked [SDK fixture](../retry-request-conformance/README.md).
It tests Cloud Storage **8.4.0** callback and download retries plus its real
`makeWritableStream` multipart path, verifying exact binary bytes and boundaries.
Both variants use `vretry-request` to hold retry behavior constant: upstream
retry-request's rejected-download bug is documented in that fixture. Five HTTP
attempts must reach the chosen teeny transport. Cache aliases are restored after
the check. No credentials, cloud account or external service is used.

```sh
npm --prefix scripts/teeny-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
node scripts/teeny-conformance/run.cjs
node scripts/teeny-conformance/run.cjs --upstream
node scripts/teeny-conformance/callers.cjs
node scripts/teeny-conformance/callers.cjs --upstream
```

Repeat with `bun` for Bun. CI runs both runtimes, composed integration, public
types and packed-archive checks. Older teeny-request majors remain outside the
declared target.
