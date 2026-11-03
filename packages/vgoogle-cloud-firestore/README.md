# vgoogle-cloud-firestore

Independent implementation of the **Firestore 9.4.0** server APIs used by
VentiMath, for Node 24+ and Bun. The former upstream runtime is removed. Five
VPM dependencies provide equality, the Firestore API, GAX, authentication and
tracing; transport and protobuf descriptors load only when needed.

```js
const {Firestore, FieldValue, Timestamp} = require('vgoogle-cloud-firestore');
const db = new Firestore();
const ada = db.doc('users/ada');
await ada.set({joined: Timestamp.now(), visits: FieldValue.increment(1)}, {merge: true});
await db.runTransaction(async transaction => {
  const snapshot = await transaction.get(ada);
  transaction.update(ada, {visits: snapshot.get('visits') + 1});
});
```

## Application contract

- Documents, collections, collection groups, converters and snapshots; timestamps,
  GeoPoints, bytes, references, int64 values and vectors.
- Filters, composite filters, ordering, projection, offsets, limits, snapshot/value
  cursors, vector queries, count/sum/average, streams and snapshot listeners.
- Set/create/update/delete, merge masks, transforms, preconditions, batches,
  read-write/read-only transactions, bulk writes and recursive deletion.
- Project/database settings, credentials, emulator routing, native gRPC and
  `preferRest` HTTP requests. Listeners use gRPC even with REST enabled.
- Firebase Admin re-exports and Firebase Functions event snapshot materialization.
  CommonJS, native ESM and TypeScript 7 consumers are checked.

Enterprise BSON/pipeline APIs, bundles, query partitioning, explain/profile APIs
and custom BulkWriter throttling are outside this application contract. They are
not shipped as retained upstream implementations. Historical internal module
paths and the `pipelines` entry point are removed. The package is not yet adopted
by VentiMath; this completion does not claim a live-cloud deployment.

## Correctness and lifecycle

Writes and query arguments are encoded when built, so subsequent caller mutations
cannot alter queued requests. Prototype-shaped map fields remain own properties.
Malformed values, cycles, overlapping update/merge paths and invalid transforms
reject before an operation is queued. A `mergeFields` selection cannot silently
discard a delete sentinel or replace a parent containing one; the upstream SDK
accepts two combinations that its cross-SDK fixtures say should reject. A vector
distance threshold of zero is preserved instead of omitted.

Transactions serialize their first read to acquire one transaction ID, enforce
reads before writes, retry bounded attempts and discard failed write sets. Even
if a caller catches a failed read, the transaction cannot commit. Bulk writes
settle individual outcomes and bound retries. Recursive deletion traverses missing
parent documents, deletes descendants before ancestors, and reports failures.
It is a bounded traversal, not a reproduction of upstream's adaptive throughput
scheduler. Custom throttling is explicitly rejected.

Destroyed query streams cancel transport immediately. Reads after `terminate()`
reject instead of hanging; active listeners and writers must be closed first.
Cleanup or logging failures cannot replace a completed operation's result.
Firebase Functions protocol snapshots preserve decoded int64 values and nanosecond
timestamps without retaining mutable byte buffers.
Default logging emits no document data; an optional callback receives static
operation lifecycle messages.

Listeners coalesce changes at consistent read times and reconnect with the last
consistent resume token. The independent persistent AVL index preserves ordering and change
ranks without mutating earlier snapshots. Reset, equal-field path ties, removals,
reorders and snapshot read times have dedicated checks. Diagnostics and tracing
use the VPM package identity.

## Evidence

The [conformance fixture](../../scripts/firestore-conformance/README.md) records
213 cross-SDK write/query cases, 14 Listen cases, real local gRPC/REST callers and
33 focused tests on Node and Bun. Both direct and Firebase Admin wire controls
produce identical 25 requests and 23 results against 9.4.0. A read-only comparison
of VentiMath's backend types adds no diagnostic locations; its existing 18
unrelated diagnostics remain, so it is not a clean app-build claim.

The historical 1,009 active upstream tests run against **upstream only**. Many
assert private module layout or APIs outside this contract; that total is not
claimed as replacement conformance. Generated protocol definitions live in
`vgoogle-cloud-firestore-api`; this package contains no copied SDK runtime.

Snapshot materialization now copies known Firestore Value containers directly,
while preserving owned bytes, nested maps/arrays, decoded int64 values, timestamp
precision and unknown wire fields. Returned data remains independently decoded;
there is no mutable decoded-data cache.

The refreshed isolated 12-field fixture records snapshot creation plus decoding
at 7.3 → 8.6 microseconds on Node (+17%) and 3.9 → 5.5 microseconds on Bun (+42%).
The remaining overhead is explicit: this path copies caller-owned protocol data,
unlike upstream's retained references. Encoding takes 9%/31% less time on Node/Bun,
independent snapshot equality 13%/43% less, and query construction 38%/8% less.
Node compiled merge writes take 70% less time; Bun's write direction is unestablished
beyond the controls in this recording. Bun timestamp operations cost 23 additional
nanoseconds (+39%); Node's difference is inconclusive. All raw samples and controls
are retained. These are local CPU measurements, not application or network latency
claims; earlier recordings remain in repository history.

See [current isolated measurements](bench/results/README.md),
[index measurements](bench/snapshot-results/README.md),
[provenance](PROVENANCE.json) and [central improvements](../../IMPROVEMENTS.md).
