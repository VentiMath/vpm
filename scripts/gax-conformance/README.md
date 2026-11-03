# Google API extensions comparison fixture

Pins **google-gax 6.14.0**, checked November 2, 2026, and its comparison helpers.
The source snapshot comes from release tag `google-gax-v6.14.0` at
`cb723569f62de17cb07011e806981b64e80efe3d` in
[google-cloud-node](https://github.com/googleapis/google-cloud-node/tree/cb723569f62de17cb07011e806981b64e80efe3d/core/packages/gax).
[SHA256.json](upstream/SHA256.json), the original package manifest and Apache
license accompany the byte-for-byte tests and fixtures. TypeScript snapshots
have a `.txt` suffix so root Bun discovery does not execute them unprepared.

`run.cjs` checks hashes, copies the selected retained `build/src` build into a temporary
directory, and compiles 28 test files plus two helpers with TypeScript 7.
It preserves the upstream assertions except for one deliberate correction:
the malformed-message ProtoJSON case must reject the same payload with a
`TypeError`, instead of replacing a string field value with an empty message.
That expectation changes only for VPM; the original control retains its assertion.

The 72 namespace imports use `import = require` to preserve callable `assert`
and Sinon-mutable CommonJS objects. A private module loader selects each runtime
dependency and routes the real Dialogflow CX 6.0.1 fixture through the selected
gax module on Node and Bun. Version assertions read the selected package's own
manifest. No global application modules are replaced.

This gate verifies the retained compatibility surface, not the independent
application runtime. All **755 cases execute: 751 pass and four retain upstream's skips**, for both
variants on both runtimes. Those skips concern three old retry/timing/A-B tests
and the metadata A-B header test. The 20-second per-test timeout accommodates
real retry backoff. `bunInstall.ts` is excluded: it installs/builds every package
in Google's monorepo, not gax's runtime API. The included Bun certification matrix
still tests its local installer fixtures and transport behavior. Cloud/system,
browser and showcase upload suites are outside this gate.

The upstream OpenTelemetry tracing harness uses SDK trace-base 2.12.0 with API
1.9.0 as isolated comparison dependencies. They are not VPM runtime dependencies
or compiler targets. VPM uses its own API 1.10.0 implementation; the separate
[OpenTelemetry fixture](../otel-conformance/README.md) verifies current SDK 3.0.0
interoperability. This fixture also exercises the selected gax tracing helper
with SDK 3.0.0 promise, callback, error and stream calls. Dialogflow is upstream's pinned validation fixture, not a new
application target.

`regressions.cjs` reproduces the upstream path substitution, validation, wildcard,
shared-options and malformed JSON problems before checking the fixes.
`callers.cjs` privately loads actual **Firestore 9.4.0** from the separately locked
[protobuf fixture](../protobuf-conformance/package.json), substituting only gax.
It verifies generated RPCs plus high-level reads, batches, transactions and query
streams. Local REST calls run through real Google Auth and gaxios, including
native-fetch selection, error status mapping and a truncated stream emitting
exactly one error. No cloud credentials or deployment are involved.

`proto-cache.cjs` runs each implementation in a separate process. It preserves
content-based hits, changed descriptors, forced refresh, global clearing and
failed-compilation retries, and demonstrates upstream compiler mixing and
key/descriptor mismatch from accessors. The new cache compiles one JSON snapshot
and detaches nested descriptor options. The benchmark loads only the selected
GAX implementation per worker; both local RPC variants use the same upstream
server fixture. CPU helper timings and local loopback RPC timings are distinct
from deployed latency.

```sh
npm --prefix scripts/gax-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/protobuf-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/otel-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/gax-conformance/run.cjs --upstream
node scripts/gax-conformance/run.cjs
node scripts/gax-conformance/regressions.cjs
node scripts/gax-conformance/callers.cjs --upstream
node scripts/gax-conformance/callers.cjs
```

Repeat with `bun`. CI additionally checks root tests, declarations, isolated
archives and the combined integration stack. See the
[package contract](../../packages/vgoogle-gax/README.md) and
[current benchmark record](../../packages/vgoogle-gax/bench/application-results/README.md).


The IAM/default-endpoint and empty-protobuf-root follow-up clears ten failures
exposed after the independent transports landed. The unchanged suite again reports
751 passes, zero failures and four upstream skips on both runtimes. Separate
package tests cover default/custom endpoints, frozen caller options and continued
rejection of malformed gRPC targets; no upstream assertions were relaxed.

## Independent application runtime

Root/fallback/gax exports now use the independently written `app-runtime/`.
Administration/LRO adapters load retained compatibility code only when used;
protocol data and some compatibility declarations remain attributed upstream.
Import guards run on both CJS and ESM archives so Bun's CJS namespace inspection
cannot accidentally load the old runtime.

`application.test.cjs` covers 17 groups: isolated frozen settings, callback and
promise settlement, stub initialization deadlines/cancellation, backoff teardown,
pagination, backpressure, terminal stream status, retry/resumption safety,
throwing retry hooks, strict JSON framing at every split and resource paths.
The frozen-settings control reproduces upstream's mutation failure first.

`firestore.cjs` runs the stock Firestore SDK with only GAX substituted and compares
23 results / 25 decoded requests. It includes transactions, queries, bulk writes,
Watch data and reconnect resume tokens against the same original server fixture.
`rest-application.cjs` compares original and independent transports through real
HTTP, authentication and fetch: UTF-8, empty 204 responses, JSON and HTML errors,
cancellation, deadlines during the body, immediate stream delivery and quiet
transport-stream cancellation.

`archives.cjs` packs the full 24-package VPM closure and installs it through npm
and Bun in isolated directories. It verifies independent CJS/ESM exports and
TypeScript 7 NodeNext/Bundler consumers without ambient platform types. The
separate generated Firestore API gate retains all 320 upstream cases and checks
31 requests across 24 RPCs / 25 results, including retained administration/LRO
compatibility. No real cloud services are contacted.

```sh
node --test scripts/gax-conformance/application.test.cjs
node scripts/gax-conformance/firestore.cjs
node scripts/gax-conformance/rest-application.cjs
node scripts/gax-conformance/archives.cjs
```

Repeat application tests and callers with Bun. Archive verification itself checks
both installers and runtimes. Current measurements use `bench/application.cjs`;
older helper and initialization recordings remain historical evidence.

The callback-return control requires `undefined` on both success and failure,
matching original GAX. The full repository test gate also exercises the unchanged
VPM Firestore API callback/close test, which detected a return-shape integration
regression missed by the earlier stock-caller-only checks. Promise cancellation
is unchanged.

The repository-wide `scripts/check-media-archives.cjs` gate also checks packed
Firestore dependencies against the current GAX version, includes the independent
`app-runtime` files, and requires the public root, fallback, settings and generated
client alias to resolve to those packed files. Its fresh npm/Bun consumers exercise
CJS, ESM and TypeScript exports without workspace aliases.
