# Firestore conformance

Baseline: **@google-cloud/firestore 9.4.0**, the npm tarball recorded in the
package [provenance](../../packages/vgoogle-cloud-firestore/PROVENANCE.json),
checked October 31, 2026. The release's unit tests (`dev/test`), cross-SDK
conformance runner and cases (`dev/conformance`), Mocha configuration, manifest
and license from the `firestore-v9.4.0` tag (commit
`cf2e273257719b10195f55639b18cc25472775d2`) are retained under `upstream/`
(TypeScript files use a `.txt` suffix to avoid root test discovery) and verified
against `SHA256.json` before execution. Test tools are pinned in `package.json`
at the versions the release's development ranges resolve to;
`@opentelemetry/api` is 1.9.1 because the 2.x Node SDK the tests use accepts
only < 1.10.

```sh
npm --prefix scripts/firestore-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/jwks-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/otel-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/firestore-conformance/run.cjs --upstream
node scripts/firestore-conformance/run.cjs
node scripts/firestore-conformance/regressions.cjs
node scripts/firestore-conformance/wire.cjs
node scripts/firestore-conformance/tracing.cjs
```

Repeat the runtime commands with Bun.

`run.cjs` compiles the tests with the workspace TypeScript 7 compiler (no type
checking) into upstream's build layout, links `build/src` and `build/protos` to
the implementation under test, and runs them with upstream's Mocha settings
(throw on deprecation, 10 s timeout, exit). For VPM, the tests' own
`google-gax`, `@google-cloud/firestore`, Firestore API, `protobufjs` and
`@opentelemetry/api` imports resolve to the VPM packages. **1,056 tests**: the
original passes all 1,009 active ones on both runtimes. VPM passes 1,008. The
remaining test registers a global tracer provider with the 2.x Node SDK through
API 1.9.1, which `vopentelemetry-api` (API 1.10.0) ignores as the original
1.10.0 does; `run.cjs` requires exactly that failure, and `tracing.cjs` checks
the global-provider path with OpenTelemetry SDK 3.0.0 from the
[OpenTelemetry fixture](../otel-conformance/README.md). Upstream skips 47
tests: two lazy-load checks that only run if no earlier test loaded gax, the
BulkWriter suite and one Watch case. `run.cjs --unskip` runs the last 45:
40 pass and the same 5 time out for both libraries (the four basic BulkWriter
tests await a write before flushing it).

`regressions.cjs` runs each case in a fresh process per library: modules loaded
at import, the number of google-gax copies once a client exists, reads after
`terminate()` (pending forever with unhandled rejections upstream), and the
string rejection from `terminate()` with an open listener.

`wire.cjs` starts a local gRPC Firestore server, loaded from the API package's
proto JSON, with an in-memory document store. It runs one scenario directly and
through Firebase Admin 14.5.0 from the [jwks fixture](../jwks-conformance/package.json),
with each library in its own process: writes with server timestamps,
increments, array unions and removals, field deletes and references; gets with
and without field masks; compound queries; count and sum; streams;
read-write and read-only transactions; batches; BulkWriter; a query listener;
collection listing; and precondition failures. Server logs (method, decoded
request, routing and resource headers) and results must be identical.

## Independent snapshot index

`watch-index.cjs` runs the actual original or VPM SDK against a local gRPC Listen
server. Both sort directions, path tie-breaking, additions, reorders, removals and
reset preserve change indexes. Snapshot documents are first materialized after
later changes and reset, proving persistence rather than a cached array. VPM also
asserts that its index loads and neither general red-black-tree package loads.

```sh
node scripts/firestore-conformance/watch-index.cjs --upstream
node scripts/firestore-conformance/watch-index.cjs
node scripts/firestore-conformance/run.cjs --upstream '--grep=watch|Query comparator'
node scripts/firestore-conformance/run.cjs '--grep=watch|Query comparator'
```

Repeat with Bun. The selected original suite has 61 passes and one original skip
on both SDKs and runtimes; no assertions are changed. Filtered suites now fail on
unexpected failures and on an empty selection. The full Firestore suite remains
in CI; these targeted results do not claim a new full-suite run.
[Index benchmarks](../../packages/vgoogle-cloud-firestore/bench/snapshot-results/README.md)
measure the exact former/current Watch operation sequences, in isolated workers
with balanced process order and identical-source controls.
