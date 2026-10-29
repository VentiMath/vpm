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
