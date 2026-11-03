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
36 focused tests on Node and Bun. Both direct and Firebase Admin wire controls
produce identical 25 requests and 23 results against 9.4.0. A read-only comparison
of VentiMath's backend types adds no diagnostic locations; its existing 18
unrelated diagnostics remain, so it is not a clean app-build claim.

The historical 1,009 active upstream tests run against **upstream only**. Many
assert private module layout or APIs outside this contract; that total is not
claimed as replacement conformance. Generated protocol definitions live in
`vgoogle-cloud-firestore-api`; this package contains no copied SDK runtime.

Snapshot materialization copies known Firestore Value containers directly,
while preserving owned bytes, nested maps/arrays, decoded int64 values, timestamp
precision and unknown wire fields. Decoding dispatches on the single wire tag,
with the existing priority rules retained for multi-tag values. Hot field loops
inline the prototype-collision guard; inherited setters and prototype-shaped keys
remain safe. Resource paths are scanned without split/filter/join arrays, and
timestamps retain full validation with fixed-width formatting. Returned data
remains independently decoded; there is no mutable decoded-data cache.

The nine-case isolated suite records the original snapshot-creation/decoding
fixture at 7.4 → 6.4 microseconds on Node (13% less time). Bun records
3.9 → 4.0 microseconds (+2.3%); that difference reverses across process pairs and
does not clear the 2.6% control spread. This path still copies caller-owned
protocol data, unlike upstream's retained references.

Protobuf-decoded snapshots with exact int64 values take 41%/47% less time on
Node/Bun; fresh data from retained snapshots takes 58%/48% less. Encoding,
compiled writes, query construction and independent equality also improve beyond
the controls on both runtimes. Short timestamp operations take 17% less time on
Node; Bun's short case is inconclusive. Mixed signed timestamps and fractions
take 28%/38% less time on Node/Bun. All nine Node cases and seven Bun cases improve
beyond controls; two Bun directions remain unestablished. No measured regression
clears the controls in this recording. All raw samples, including outliers, are
retained. These are local CPU measurements, not application or network latency
claims; earlier recordings remain in repository history.

See [current isolated measurements](bench/results/README.md),
[index measurements](bench/snapshot-results/README.md),
[provenance](PROVENANCE.json) and [central improvements](../../IMPROVEMENTS.md).
