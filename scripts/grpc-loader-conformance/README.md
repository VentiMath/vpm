# gRPC loader comparison fixture

Pins **@grpc/proto-loader 0.8.1**, verified as the current release on October 30,
2026, plus Mocha 11.7.5 and the upstream suite's Google proto-files 3.0.3 fixture.
The existing protobuf fixture supplies google-gax 6.14.0, Firestore 9.4.0 and
protobuf 8.8.1 controls. These are test dependencies outside VPM package archives.

## Upstream runtime tests

`upstream/` contains the complete `test/` and `test_protos/` directories from
grpc-node commit `a558430ac87b77449c3b4cbe44821ecb50f1d81f`, with its Apache-2.0
license and per-file SHA-256 hashes. The test source has a `.txt` storage suffix
to keep Bun from discovering it outside the isolated upstream runner. `run.cjs` executes all eight runtime tests
against either VPM or stock upstream. No assertion changes or skipped tests are
allowed. The separate code-generation CLI and its golden output are excluded
because VPM implements runtime loading only.

TypeScript 7 compiles temporary copies with type checking disabled; VPM's public
types have separate strict checks. One import changes from the old callable
namespace `import * as assert` to `import assert = require('assert')`. Test bodies
remain unchanged, and the original build-relative fixture paths are preserved.
The temporary `src/index` entry redirects to the implementation under test.

## Comparisons and real callers

`differential.cjs` checks 185 groups: 36 combinations of longs/enums/bytes/defaults,
four RPC methods per combination, complete Firestore definitions and four file
fixtures. Descriptor data is compared against the original loader on protobuf 8;
wire bytes and decoded values are compared against stock protobuf 7. That split
distinguishes VPM loader changes from the underlying engine upgrade. Separate
controls reproduce the method-option prototype mutation, primitive type-guard
exceptions and protobuf 7's broken descriptor-map round-trip.

`callers.cjs` exercises eight local gRPC calls across all four RPC modes, reversing
which endpoint uses VPM. Installed google-gax source loads JSON and `.proto` files.
Firestore's actual generated client then executes unary `getDocument`, streaming
`batchGetDocuments` and bidirectional `write` against an upstream server. Import
instrumentation verifies three `fromJSON` calls and one `loadSync` call. SDK
sources are evaluated with only the loader import replaced; their file hashes
must remain unchanged. No cloud endpoints, credentials or deployments are used.

```sh
npm --prefix scripts/grpc-loader-conformance ci --ignore-scripts
npm --prefix scripts/protobuf-conformance ci --ignore-scripts
node scripts/grpc-loader-conformance/run.cjs
node scripts/grpc-loader-conformance/run.cjs --upstream
node scripts/grpc-loader-conformance/differential.cjs
node scripts/grpc-loader-conformance/callers.cjs
node scripts/grpc-loader-conformance/callers.cjs --upstream
```

Repeat with `bun`. CI runs both runtimes; its integration gate also supplies the
instrumented VPM loader to these callers. Local gRPC tests need loopback listeners.
