# Firestore conformance

The pinned baseline is **@google-cloud/firestore 9.4.0**, checked November 3,
2026. Apache-2.0 sources and cross-SDK data from tag `firestore-v9.4.0`, commit
`cf2e273257719b10195f55639b18cc25472775d2`, remain under `upstream/` with SHA-256
checks. Test dependencies have a separate lockfile and never ship in VPM packages.

```sh
npm --prefix scripts/firestore-conformance ci --ignore-scripts
npm --prefix scripts/firebase-admin-conformance ci --ignore-scripts
npm --prefix scripts/otel-conformance ci --ignore-scripts
node scripts/firestore-conformance/run.cjs
node scripts/firestore-conformance/run.cjs --upstream
node scripts/firestore-conformance/wire.cjs
node scripts/firestore-conformance/watch-index.cjs --upstream
node scripts/firestore-conformance/watch-index.cjs
node scripts/firestore-conformance/regressions.cjs
node scripts/firestore-conformance/tracing.cjs
```

Repeat runtime commands with Bun. The default runner checks:

- `application.cjs`: all 213 retained set/create/update/delete/query data cases
  through public builders, against both current SDKs. Small extraction adapters
  observe compiled protobufs without writing to a cloud service. Two fixtures
  (`set-del-nomerge`, `set-del-nonleaf`) demonstrate upstream accepting ambiguous
  delete/merge combinations; VPM enforces the fixtures' rejection contract.
- `listen-cases.cjs`: all 14 retained Listen data cases through the new listener
  and a deterministic duplex transport. Expected snapshots, changes and errors
  remain unchanged.
- `reconnect.cjs`: both SDKs recover a real local gRPC disconnect with the last
  consistent resume token and document snapshot read times.

`--upstream` retains the historical TypeScript 7 compiler and original suite:
1,009 active tests and 47 original skips. It is **upstream-only reference evidence**,
not a conformance total for the independent implementation. `--unskip` and `--grep`
apply only to that original suite. Obsolete runtime redirection and private-layout exceptions are removed.

`wire.cjs` compares decoded requests, routing/resource headers and results against
9.4.0: 25 requests over seven RPCs and 23 results, directly and through Firebase
Admin 14.5.0. It covers transforms, gets, field masks, compound queries, aggregates,
streams, read-write/read-only transactions, batches, bulk writes, listeners and
precondition failures. The Admin fixture supplies the pinned original wrapper.

`watch-index.cjs` exercises ascending/descending ordering, path ties, moves,
deletes, resets and retained snapshots over actual local Listen streams.
`tracing.cjs` verifies the global OpenTelemetry SDK 3 provider. `regressions.cjs`
compares lazy imports, one transport stack, prompt termination errors and listener
cleanup; client construction uses implementation-specific observation adapters.

Thirty-three focused package tests cover values, vectors and zero thresholds,
prototype-safe maps, immutable arguments, invalid writes, converters, incomplete
reads, transaction retries/failed reads, bulk failures, recursive deletion,
decoded Functions int64/timestamp snapshots, nested wire-container/byte ownership,
unknown wire-field preservation, stream cancellation, real REST requests, lazy
imports and the persistent index.

`VPM_APP_REPO=/path/to/ventimath-private node scripts/firestore-conformance/app-types.cjs`
compiles a detached snapshot twice, mapping only Firestore and its Admin types.
The checked snapshot has 18 pre-existing diagnostics and no additional locations
under VPM. No application files or installed dependencies are changed.
