# vgoogle-cloud-firestore-api

Cloud Firestore and Firestore Admin API clients targeting
**@google-cloud/firestore-api 0.7.1**, the latest stable release checked
October 31, 2026. One transport stack (`vgoogle-gax`, `vgoogle-logging-utils`,
`vlong`); Node.js 24+ and Bun.

```js
const {FirestoreClient, FirestoreAdminClient} = require('vgoogle-cloud-firestore-api');
const client = new FirestoreClient({projectId: 'my-project'});
const [document] = await client.getDocument({name: 'projects/my-project/databases/(default)/documents/users/ada'});
for await (const item of client.listDocumentsAsync({parent: 'projects/my-project/databases/(default)/documents', collectionId: 'users'})) {
  console.log(item.name);
}
const admin = new FirestoreAdminClient();
const [operation] = await admin.createIndex({parent: admin.collectionGroupPath('my-project', '(default)', 'users'), index: {queryScope: 'COLLECTION', fields: [/* ... */]}});
const [index] = await operation.promise();
await client.close();
```

These are the generated GAPIC clients for `google.firestore.v1.Firestore`
(17 RPCs) and `google.firestore.admin.v1.FirestoreAdmin` (32 RPCs, 10 of them
long-running), with the same constructor options, method names and overloads,
call options, results, routing headers, retry configuration, path helpers,
long-running operation helpers and `protos` namespace. The
[Firestore API wire check](../../scripts/firestore-api-conformance/wire.cjs)
shows a gRPC server receiving the same requests and headers from both libraries.
This is the layer a Firestore SDK builds on; most applications use the SDK.

## Entry points

| Import | Contents |
| --- | --- |
| `vgoogle-cloud-firestore-api` | `v1`, `FirestoreClient`, `FirestoreAdminClient`, `protos`, and a default export with the first three (CommonJS and native ESM) |
| `/v1`, `/build/src/v1` | `FirestoreClient`, `FirestoreAdminClient` |
| `/client_v1`, `/admin_v1` | One client each |
| `/protos`, `/protos/protos`, `/build/protos/protos` | The static protobuf message classes and types |
| `/protos/protos.json`, `/build/protos/protos.json` | The proto JSON used to load the services |
| `/v1/firestore_client_config.json`, `/v1/firestore_admin_client_config.json` | Default retry and timeout configuration |

The paths are those of the original package's export map. Importing the package
loads three modules. A client class loads when first accessed, and `vgoogle-gax`
when the first client is constructed. `protos`, a 1.3 MB module, loads only when
it is read. Upstream loads 346 modules at import, including its gax stack and
`protos`.

## Clients

`new FirestoreClient(options?, gaxInstance?)` and `new FirestoreAdminClient(...)`
take the generated client options: `credentials`, `keyFilename`, `auth`,
`projectId`, `apiEndpoint`/`servicePath`, `port`, `universeDomain`,
`clientConfig`, `fallback` for HTTP/JSON transport, `libName`/`libVersion` and the
remaining `GrpcClientOptions`. Without `gaxInstance`, `vgoogle-gax` is used; a
caller can pass that module or its `fallback`.

| Method shape | Firestore | Calls |
| --- | --- | --- |
| Unary | `getDocument`, `updateDocument`, `deleteDocument`, `beginTransaction`, `commit`, `rollback`, `batchWrite`, `createDocument` | `promise` or `(request, options?, callback)` |
| Paged | `listDocuments`, `partitionQuery`, `listCollectionIds` | Also `xStream()` and `xAsync()` |
| Server stream | `batchGetDocuments`, `runQuery`, `runAggregationQuery`, `executePipeline` | Returns a readable `CancellableStream` |
| Bidirectional | `write`, `listen` | `method(options?)` returns a duplex `CancellableStream` |

The admin client adds unary index, field, database, backup, backup schedule and
user credential methods; paged `listIndexes` and `listFields`; long-running
`createIndex`, `updateField`, `exportDocuments`, `importDocuments`,
`bulkDeleteDocuments`, `createDatabase`, `updateDatabase`, `deleteDatabase`,
`restoreDatabase` and `cloneDatabase`, each with `checkXProgress(name)`; the
operations helpers `getOperation`, `cancelOperation`, `deleteOperation` and
`listOperationsAsync`; and path builders and matchers for backups, backup
schedules, collection groups, databases, fields, indexes, locations, projects
and user credentials. Both clients have `getLocation`, `listLocationsAsync`,
`getProjectId`, `initialize` and `close`.

Declarations are [generated](../../scripts/build-firestore-api.cjs) from the
method table and the proto JSON, so their request, response and resource types
cannot drift from the runtime. They compile without Node, Undici or DOM types:
`bytes` fields are `Uint8Array | Buffer | string` where Node types are loaded and
`Uint8Array | string` otherwise.

## Changes from 0.7.1

- **One stack.** Upstream depends on `google-gax` ^6 and `long`; Firestore SDKs
  that pin an older range install a second gax and gRPC stack beside their own.
  This package uses the VPM stack only.
- **Lazy loading.** See above: about 2 ms to import instead of about 270 ms.
- **Construction cost.** Upstream hashes the 300 KB proto JSON on each client
  construction to find gax's cached copy, and parses it again for long-running
  decoders. Both are cached by identity here, and constructing either client
  takes 65-80% less time.
- **Caller options are not modified.** Upstream writes the routing header into
  the `options` object it is given, so a reused options object carries one
  request's routing into the next. Headers are added to a copy here.
- **Missing parent messages route as empty.** `updateDocument({})` and similar
  requests threw a `TypeError` synchronously upstream, before any promise or
  callback. They are sent with an empty routing value, as top-level fields are.
- **No unhandled rejections.** Upstream re-throws a failed stub from
  `initialize()` as an unhandled rejection, which terminates Node by default,
  and does not wait for its locations client in `close()`. Here a failed stub
  rejects only the calls that need it, and `close()` waits for the locations and
  operations clients and rejects if either fails.
- **Closed clients fail promptly.** A server stream opened after `close()`
  starts reported the closure only after retry-request's two no-response retries,
  about seven seconds later; upstream's own tests disable those retries to avoid
  waiting. It fails immediately here.
- **Operations helpers accept a missing request**, as the other methods do.
  Upstream threw a `TypeError` reading `request.name`.
- **Status details.** Upstream decodes `google.protobuf.Any` error details for
  unary calls only, dropping any it cannot decode, and parses the proto JSON for
  each such error. Details are decoded for long-running and paged calls too,
  undecodable ones are kept as received, and the parsed root is reused.
- **Path builders check their arguments** and name a missing one, where upstream
  failed inside the template with an engine `TypeError` about `undefined`.

Upstream's client classes report their names as `FirestoreClient` and
`FirestoreAdminClient`; so do these. Its internal members (`_gaxGrpc`, `_protos`,
`innerApiCalls`, `descriptors`, `firestoreStub` and so on) keep their names and
roles, since its own unit tests and some callers stub them.

## Evidence

- [Upstream suite](../../scripts/firestore-api-conformance/README.md): the 320
  generated unit tests of the 0.7.1 release pass unchanged on Node and Bun, on
  `vgoogle-gax`.
- [Wire check](../../scripts/firestore-api-conformance/wire.cjs): 31 requests
  over 24 RPCs to a local gRPC server, covering every call shape, with requests,
  routing headers, client headers and 25 results identical to the original on
  google-gax 6.14.0.
- [Regressions](../../scripts/firestore-api-conformance/regressions.cjs): each
  behavioral change above reproduced with the original, then checked here.
- [Focused tests](test/firestore-api.test.cjs) and [type tests](test/types.ts).
- [Measurements](bench/results/README.md), with controls and source hashes.

Apache-2.0 licensing and the pinned source are recorded in
[PROVENANCE.json](PROVENANCE.json).
