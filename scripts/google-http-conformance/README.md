# Google HTTP dependency compatibility

These are development-only test tools and immutable upstream source archives.
They are excluded from VPM package archives and application runtime dependencies.
Versions, source commits and archive hashes are recorded in each package's
`PROVENANCE.json` and verified by the runners.

```sh
npm --prefix scripts/google-http-conformance ci --ignore-scripts
node scripts/google-http-conformance/helpers.cjs
bun scripts/google-http-conformance/helpers.cjs
node scripts/google-http-conformance/helpers.cjs --upstream
```

The helper runner executes extend 3.0.2's original Tape 4 assertions: 90 pass,
with the single test that removes the native `Array.isArray` intrinsic skipped
on both implementations. No assertions are changed. Tape 4 is deliberately
pinned because newer equality semantics reject some of these legacy assertions
even against upstream. Focused VPM tests use modern strict assertions.

All 47 assertions in is-stream 2.0.1's five test groups run through a small
strict-assert adapter. Only imports, test framework plumbing and temporary-file
creation change; assertion contents are unchanged. Node and Bun pass both suites.

`node scripts/google-http-conformance/uuid.cjs` (or `bun`) runs 45 UUID 9.0.1
upstream tests, including 1,000 deterministic parse round trips. The runner
changes imports and test registration, skips the four private/browser hash
helper tests, and preserves all remaining assertions. It also supports
`--upstream`. The native algorithms are checked through public v3/v5 vectors.


## HTTP transports

```sh
node scripts/google-http-conformance/fetch.cjs
bun scripts/google-http-conformance/fetch.cjs
node scripts/google-http-conformance/gaxios.cjs
bun scripts/google-http-conformance/gaxios.cjs
```

Both runners also accept `--upstream` and compare against the published packages
in `scripts/consumers`. Source archive hashes are checked before extracting into
temporary directories. The workspace TypeScript 7 compiler translates upstream
tests without type-checking them; it does not rebuild the production packages.
Temporary wrappers expose node-fetch internals only to its original tests.

**node-fetch 2.7.0:** 214 tests pass and two conditional tests remain pending on
both runtimes and both implementations. The pending cases concern an obsolete
pre-Node-8 stream guard and the absence of the optional encoding fixture, which
is installed here. The v2.7.0 release tag and registry gitHead identify the same
archive despite its stale internal package version.

Fixture changes applied to both implementations replace obsolete Babel/test
configuration, use the native URL implementation, convert an HTTP status fixture
to a number, and preserve DNS lookup's modern `all` option. The external GitHub
HEAD request uses a local TLS server and fixture certificate. The Buffer.concat
fault-injection test emits two chunks so both implementations actually call
concat. Bun's stack assertion checks the function name without assuming Node's
error-name prefix. The one VPM-specific assertion expects the sanitized collector
error message. No public behavior assertions are otherwise removed.

**gaxios 6.7.1:** all 109 tests pass on both runtimes and implementations, with no
skips. Test imports point to the matching transport/proxy implementation and
proxy environment variables are cleared for deterministic local fixtures.
Obsolete throw-deprecation Mocha configuration is disabled for both baselines.
VPM expectations cover working native FormData serialization, keeping destination
certificates out of proxy options, distinct agents for distinct TLS identities,
the corresponding private cache keys, and stopping retries before an expired
budget. The original upstream expectations remain active with `--upstream`.

The additional Mocha, Chai, Sinon, Nock, encoding and multipart packages are
isolated test fixtures. They are not runtime dependencies or shipped VPM files.
`consumer.cjs` separately exercises real teeny-request and gaxios calls through
the version-scoped integration aliases, including multipart and retry behavior.

## Service-account tokens

`node scripts/google-http-conformance/gtoken.cjs` (or `bun`) executes all 45
upstream gtoken 7.1.0 tests. `--upstream` runs the published package with its
original behavior assertions. Both implementations pass on both runtimes.

The fixture adapts legacy callable namespace imports for TypeScript 7 and selects
the published node-fetch 2 transport explicitly for the upstream control. Bun's
native fetch compatibility module bypasses Nock; native fetch is therefore blocked
in this runner. All token requests are intercepted, with no live Google service
calls. The source archive hash is verified before extraction.

VPM expectations use the current OAuth token endpoint and POST-body revocation,
supply a valid token response where upstream accepts an empty success body,
expect one shared forced refresh instead of two parallel exchanges, and expect
safe error messages without remote descriptions. The old browser-like test that
deletes callback `fs.readFile` instead verifies that `fs/promises` still reads
credentials. No tests are skipped. Fixture changes are applied only in temporary
extractions; the upstream archive is immutable.

The integration gate additionally runs google-auth-library 9.15.1's real
`JWT.authorize()` and `fetchIdToken()` methods through version-scoped `vgtoken`,
`vgaxios` and `vjws` aliases, verifies the emitted RSA assertions, and exchanges
synthetic tokens with a loopback HTTP server.

## Google SDK logging

`node scripts/google-http-conformance/logging.cjs` (or `bun`) runs all ten public
logging suite entries from google-logging-utils 0.0.2. Assertions are unchanged for
VPM and `--upstream`; both runtimes pass. One upstream backend-replacement entry
has an empty body, so the focused VPM tests separately cover that behavior. Four
tests for the unexported Temporal helper are outside this public-API replacement.
The runner verifies the original gax-nodejs commit archive, extracts only the
logging-utils subtree and compiles its tests with TypeScript 7.

## json-bigint 1.0.0

`node scripts/google-http-conformance/json.cjs` (or `bun`) runs all 18 original
suite entries from commit `390482a8b6b460f98c61c3b65915dbd91fc8e7b2`.
The runner verifies the archive SHA-256 before extraction. `--upstream` checks
the unmodified assertions against the pinned original package. Chai 4.5.0 is an
isolated fixture alias matching the original suite's major version.

VPM adaptations change the default BigNumber identity to ExactNumber and three
error-message assertions to sanitized messages. Other assertions are unchanged.
The integration consumer exercises CloudEvents' actual native-bigint parser and
restores the global JSON binding that CloudEvents replaces.

## gcp-metadata 6.1.1

`node scripts/google-http-conformance/metadata.cjs` (or `bun`) runs all 66 original
suite entries from commit `63805cd00cddb8efc21a129c8044808207b0b342`, after archive
SHA-256 verification. `--upstream` runs the unchanged assertions against the
pinned original. Native fetch is blocked, Nock disables external connections, and
the upstream control uses its Node transport on both runtimes.

VPM adaptations cover three sanitized flavor-error assertions, one unknown-option
message, the finite cloud timeout, seven primary-failure cases whose secondary
now succeeds, and the successful secondary after cache reset. The DEBUG_AUTH
case makes both endpoints fail and expects a static message. TypeScript namespace
imports of callable/mutable Node modules use `import = require` for TS7 fixture
compilation. Residency assertions are unchanged. No test entries are skipped.

The integration consumer drives Google Auth 9.15.1 Compute access/ID tokens,
metadata project lookup and universe-domain 404 fallback using local HTTP.
