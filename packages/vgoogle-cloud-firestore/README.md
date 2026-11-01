# vgoogle-cloud-firestore

**Implementation status:** the current package retains upstream implementation
code with the changes documented below. Its tests verify that adapted build.
An independently written implementation of the application-facing APIs is
pending; this package is not yet a completed rewrite.

The Cloud Firestore server client, targeting **@google-cloud/firestore 9.4.0**,
the latest stable release checked October 31, 2026, and the version Firebase
Admin 14 uses. All six runtime dependencies are VPM packages; Node.js 24+ and
Bun.

```js
const {Firestore, FieldValue, Timestamp} = require('vgoogle-cloud-firestore');
const db = new Firestore();
const ada = db.collection('users').doc('ada');
await ada.set({name: 'Ada', joined: Timestamp.now(), visits: FieldValue.increment(1)}, {merge: true});
const top = await db.collection('users').where('visits', '>', 10).orderBy('visits', 'desc').limit(5).get();
await db.runTransaction(async transaction => {
  const snapshot = await transaction.get(ada);
  transaction.update(ada, {visits: snapshot.get('visits') + 1});
});
```

This is 9.4.0's implementation: the same API, settings, environment variables
(`FIRESTORE_EMULATOR_HOST`, `FIRESTORE_PREFER_REST`, `FIRESTORE_ENABLE_TRACING`),
serialization, queries, aggregations, transactions, batches, BulkWriter,
listeners, bundles, recursive delete, vector search, pipelines
(`vgoogle-cloud-firestore/pipelines`) and OpenTelemetry tracing. CommonJS,
native ES module and TypeScript imports are supported, as is the original's
`new (require('vgoogle-cloud-firestore'))()` form. Firebase Admin 14 can load it
in place of `@google-cloud/firestore`.

| Upstream dependency | Here |
| --- | --- |
| `@google-cloud/firestore-api` ^0.2.0, with its own `google-gax` ^5 | [`vgoogle-cloud-firestore-api`](../vgoogle-cloud-firestore-api/README.md) 0.7.1 API on the same gax |
| `google-gax` ^6 | [`vgoogle-gax`](../vgoogle-gax/README.md) |
| `protobufjs` ^7 | [`vprotobufjs`](../vprotobufjs/README.md) |
| `fast-deep-equal`, `functional-red-black-tree`, `@opentelemetry/api` | `vfast-deep-equal`, `vfunctional-red-black-tree`, `vopentelemetry-api` |

## Changes from 9.4.0

- **One transport stack.** Upstream pins `@google-cloud/firestore-api` ^0.2.0,
  which brings a second, older google-gax with its own gRPC, auth and protobuf
  copies. Here the generated client layer runs on the same gax as everything else.
- **Cold start.** Upstream loads that firestore-api package at import, and with
  it gax, protobufjs and the static protos, although
  its own tests require that importing Firestore loads neither gax nor protobufjs
  (they are skipped whenever another test loaded gax first, so they never run).
  Here the `protos` export, OpenTelemetry and the transport load on first use.
  Earlier startup timing figures are historical.
- **Reads after `terminate()`.** Upstream's streaming requests discard the
  client pool's rejection. A query, document get, `getAll`, aggregate or
  listener on a terminated client waits forever, and the rejection is
  unhandled, which ends a Node process by default. Here each rejects at once
  with "The client has already been terminated", without retries.
- **`terminate()` errors are Errors.** With open listeners or BulkWriters
  upstream rejects with a bare string; here an `Error` with the same message.
- **Closing idle connections.** A failure closing an idle GAPIC client is logged
  instead of turning the operation that released it into a failure.
- **No v1beta1.** `Firestore.v1beta1`, a deprecated private accessor for the
  v1beta1 GAPIC client, throws a descriptive error. `Firestore.v1` remains.
- **Declarations.** Upstream's declarations only resolve under the name
  `@google-cloud/firestore` and need Node's ambient types. Here they are a module
  under any name, keep the `FirebaseFirestore` global namespace, and need no
  ambient Node types; `stream()` results stay assignable to
  `NodeJS.ReadableStream` and bundles are Node `Buffer`s where Node types are
  loaded.

The `x-goog-api-client` library token and the OpenTelemetry tracer name report
`vgoogle-cloud-firestore` and its version. OpenTelemetry follows
`vopentelemetry-api` 1.10.0: as with the original 1.10.0 API, a global provider
registered through API 1.9 (as the 2.x Node SDK does) is not used.

## Evidence

- [Upstream suite](../../scripts/firestore-conformance/README.md): the 9.4.0
  release's unit tests and the cross-SDK conformance suite, 1,008 of 1,009 active
  tests unchanged on Node and Bun; the remaining test's OpenTelemetry setup is
  covered separately. With upstream's skips lifted, the 45 skipped tests behave
  identically for both libraries.
- [Wire check](../../scripts/firestore-conformance/wire.cjs): writes with every
  transform, gets, `getAll`, queries, aggregates, streams, transactions,
  batches, BulkWriter, a listener and precondition errors against a local gRPC
  Firestore, directly and through Firebase Admin 14.5.0. Server logs and results
  are identical to the original.
- [Regressions](../../scripts/firestore-conformance/regressions.cjs): each
  behavioral change above reproduced with the original, then checked here.
- [Focused tests](test/firestore.test.cjs) and [type tests](test/types.ts).
- [Measurements](bench/results/README.md): isolated Node 24 and Bun per-operation CPU,
  with controls and source hashes. All six Node cases are inconclusive at the
  observed variation. Bun query construction costs 11.3% more; its other cases
  are inconclusive. Inconclusive does not mean equal performance.

Apache-2.0 licensing, the pinned source and the files changed from it are
recorded in [PROVENANCE.json](PROVENANCE.json).
