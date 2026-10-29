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

Both runners accept `--upstream`. Fetch compares against the published package
in `scripts/consumers`; Gaxios compares against the locked `gaxios8` fixture here.
Archive or individual source hashes are checked before temporary compilation. The workspace TypeScript 7 compiler translates upstream
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
error message. The body-deadline fixture enables its 20ms timeout after headers
arrive, isolating body collection from connection scheduling on busy hosts. Its
assertions are unchanged and the same adaptation applies to upstream. No public
behavior assertions are otherwise removed.

**gaxios 8.3.2:** 133 applicable runtime tests pass on Node and Bun. The published
control passes all 136. Sources are pinned to release commit
`b3a96877f6830e2869b9026e95c10df41923790d`, with per-file SHA-256 verification.
Nock 14 and Sinon 21 are isolated aliases matching this suite's dependencies.

VPM skips two tests of upstream's private Bun proxy/stream adapter and one of its
build-directory allowlist. Real VPM native/agent HTTP tests and installed-archive
gates cover those responsibilities. The old TypeScript compiler-API portion is
replaced by the workspace TypeScript 7 consumer/public/archive gates, including
an augmented `fetch.preconnect` namespace and a Gaxios fetch call-signature
assignment. Its runtime custom-fetch assertion still runs on both controls.

VPM expectation changes cover destination certificate isolation, distinct TLS
identities/cache keys, native cancellation reasons, pre-abort rejection before
an adapter, cancelled backoff preventing another attempt, and bounded retry
budgets. The original expectations remain active with `--upstream`. On Bun,
Nock's HTTPS ClientRequest interception omits protocol information; the harness
normalizes HTTPS `proto` and the default port for both implementations. This
changes fixture plumbing, not production transport. Proxy classes resolve from
the implementation under test so `instanceof` compares the matching copy.

The additional Mocha, Chai, Sinon, Nock, encoding and multipart packages are
isolated test fixtures. They are not runtime dependencies or shipped VPM files.
`consumer.cjs` separately exercises real teeny-request and gaxios calls through
the version-scoped integration aliases, including multipart and retry behavior. Current Google Auth 10.6.1 and 11.3.2
fixtures separately exercise real OAuth refresh and authenticated request methods
through vgaxios. Integration also traverses both current auth graphs; Gaxios 6
is reported as uncovered rather than aliased across its response-shape changes.

### Current Google clients and native Fetch

`current-fetch.cjs` runs 12 caller scenarios each against pinned Gaxios 7.1.3
and 8.3.2, using `vnode-fetch`, published node-fetch 3.3.2, or the runtime's native
Fetch. All traffic uses local HTTP servers. Gaxios remains unmodified and receives
the transport through its public `fetchImplementation` option. These checks do
not imply complete Fetch 3 API compatibility. The version-3 source is imported
by explicit file path so Bun cannot substitute its built-in node-fetch shim.

```sh
node scripts/google-http-conformance/current-fetch.cjs
node scripts/google-http-conformance/current-fetch.cjs --upstream
node scripts/google-http-conformance/current-fetch.cjs --native
bun test ./scripts/google-http-conformance/current-fetch.cjs
FETCH_MODE=upstream bun test ./scripts/google-http-conformance/current-fetch.cjs
FETCH_MODE=native bun test ./scripts/google-http-conformance/current-fetch.cjs
```

The native comparison verifies ordinary requests, then **asserts the observed
compatibility gaps**, rather than treating them as supported behavior: ignored
Node agents, ignored streamed-response size bounds, Web Stream responses, and
on Node, ignored redirect-count bounds. Bun honors the redirect-count option.
A passing native probe is therefore not a passing drop-in compatibility gate.
These observations guide native transport reuse when upgrading VPM callers.

## Service-account tokens

`node scripts/google-http-conformance/gtoken.cjs` (or `bun`) executes all 45
upstream gtoken 7.1.0 tests. `--upstream` runs the published package with its
original behavior assertions. Both implementations pass on both runtimes.

The fixture adapts legacy callable namespace imports for TypeScript 7 and selects
the matching Node transport explicitly for both implementations. Bun's
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

`node scripts/google-http-conformance/logging.cjs` (or `bun`) runs all 17 public
suite entries from google-logging-utils 2.1.1 unchanged, plus ten entries from
0.0.2. Both runtimes pass. `--upstream` runs each published version against its
original expectations. Each suite contains an empty backend-replacement entry;
focused VPM tests separately cover stable logger and event-sink identity.

The sole VPM adjustment to the old suite expects an explicitly selected backend
to work without the environment flag, matching 2.1.1. No entries are skipped.
Tests for the unexported Temporal helper remain outside this public-API scope.

For 0.0.2, the runner verifies the original gax-nodejs archive and extracts its
logging-utils subtree. For 2.1.1, the vendored test file matches Git blob
`e858713021e7734821ccbace5e6358513f90aa69` at release commit
`cb723569f62de17cb07011e806981b64e80efe3d`; its SHA-256 is verified before use.
The Apache-2.0 license accompanies that source. TypeScript 7 compiles the tests
in temporary directories with import wrappers selecting the implementation.
The published 2.1.1 control is an exact, independently locked development dependency.

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
both implementations explicitly use their Node transports on both runtimes.

VPM adaptations cover three sanitized flavor-error assertions, one unknown-option
message, the finite cloud timeout, seven primary-failure cases whose secondary
now succeeds, and the successful secondary after cache reset. The DEBUG_AUTH
case makes both endpoints fail and expects a static message. TypeScript namespace
imports of callable/mutable Node modules use `import = require` for TS7 fixture
compilation. Residency assertions are unchanged. No test entries are skipped.

The integration consumer drives Google Auth 9.15.1 Compute access/ID tokens,
metadata project lookup and universe-domain 404 fallback using local HTTP.
