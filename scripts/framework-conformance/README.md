# Functions Framework conformance fixture

Runs the unit and HTTP integration tests from the verified
`@google-cloud/functions-framework` **5.0.2** source tag against
`vfunctions-framework`. The archive hash is pinned in the package's
[provenance](../../packages/vfunctions-framework/PROVENANCE.json).

```sh
bun install --frozen-lockfile --ignore-scripts
npm --prefix scripts/consumers ci --ignore-scripts
npm --prefix scripts/framework-conformance ci --ignore-scripts
node scripts/framework-conformance/run.cjs
bun scripts/framework-conformance/run.cjs
```

All **105 tests** pass on Node 24 and Bun 1.4.0, with **no assertion changes or
skips**. The suite covers configuration, registration, CJS/ESM loading, execution
context, logging, HTTP functions, callback/promise events, binary/structured
CloudEvents, legacy Google conversions and Pub/Sub emulator delivery. It runs in
CI alongside the package's additional regression tests.

The runner verifies and extracts the archive into a temporary directory and
transpiles its tests with the workspace's TypeScript 7 compiler. Only compiled
implementation imports are redirected. The upstream tests use callable CommonJS
namespace imports and mutable Sinon stubs; TS 7 always enables interop, so the
runner restores that original emitted import convention. Assertions and fixtures
are otherwise unchanged. Type checking belongs to the separate VPM declaration
gates; this test transpilation uses `noCheck` and no legacy compiler.

The upstream `pack-n-play` system test and external conformance shell harness are
not part of these 105 tests. VPM's [archive gate](../check-media-archives.cjs)
separately verifies installed-package contents, exports, CLI help, actual HTTP
serving and TypeScript consumers under npm and Bun. This does not assert that a
Google-hosted deployment or the separate external conformance harness was run.

For an unchanged published implementation, append `--upstream`. Node passes all
105 tests. Bun 1.4.0 passes 81 and fails 24: request-domain lookup breaks event
callbacks and deferred synchronous throws escape the wrapper. VPM fixes those
paths instead of skipping their tests.

The locked Mocha, Sinon and Supertest dependencies are development-only. They
stay outside the workspace and every installable VPM archive. Express used by
the upstream loader tests comes from the pinned consumer fixture. Set `OUTPUT`
to save the full Mocha JSON report.
