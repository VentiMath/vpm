# vgrpc-js

A gRPC HTTP/2 client and server derived from **@grpc/grpc-js 1.14.7**, for Node.js
24 and Bun. It uses `vgrpc-proto-loader` and `vordered-map`; its entire external
runtime dependency tree consists of VPM packages.

```js
const { Metadata, credentials, loadPackageDefinition } = require('vgrpc-js');
const { loadSync } = require('vgrpc-proto-loader');

const api = loadPackageDefinition(loadSync('./service.proto'));
const metadata = new Metadata();
metadata.set('authorization', 'Bearer example');
// Construct your generated service client with credentials.createSsl().
```

CommonJS and native ES module imports expose the same runtime API. Package-local
TypeScript declarations compile without ambient Node, Undici or browser types;
Node stream, socket and TLS capabilities use structural declarations.

## Changes from upstream

- Complete frames take one copy instead of assembling separate flag, size and
  payload fragments. Returned buffers remain independent of the input; split
  frames, empty messages and receive-size limits retain their behavior.
- Completed fragmented messages release references to their input chunks
  immediately. An idle decoder no longer holds the previous message's chunks.
- `Metadata.getMap()`, `toHttp2Headers()` and `toJSON()` preserve an own
  `__proto__` key without invoking the inherited setter. Results retain their
  ordinary object prototype; existing buffer-copy behavior is preserved.
- Incoming header names are classified case-insensitively. Custom
  binary headers split comma-combined values inside arrays as well as strings.
  Reserved `grpc-` headers retain their existing treatment.
- `loadPackageDefinition()` creates own namespace objects for names such as
  `toString`, instead of assigning package contents to inherited functions.
  Upstream's protected-key exclusions remain in place.

These are deliberate corrections. Ordinary metadata coercion and validation,
message serialization, status codes, retries and credential behavior are retained.
Published JavaScript and declarations are maintained directly; redundant source
maps and TypeScript implementation copies are omitted from installable archives.
Original licenses and source hashes are retained in [PROVENANCE.json](PROVENANCE.json).

## Verified scope

The runtime retains upstream's client/server, resolver, retry, compression,
load-balancing, Channelz, credential and experimental exports. Verification uses
the retained upstream suite plus focused frame/metadata/prototype tests and
**1,504 deterministic differential comparisons**.

Actual **google-gax 6.14.0** and **Firestore 9.4.0** methods exercise unary,
server-streaming and bidirectional requests against local servers. Interoperability
checks cover all four RPC modes in both directions between original and VPM
endpoints, plus verified TLS with metadata call credentials. The full repository
integration gate exercises the VPM dependencies together. These checks use no
cloud credentials and do not establish live-service deployment or exhaustive
coverage of experimental features.

See the [conformance fixture](../../scripts/grpc-conformance/README.md) for exact
suite results, original controls, runtime limitations and test-harness adapters.
[Paired benchmarks](bench/results/README.md) cover framing, metadata, client-class
construction and local RPCs. Their results are workload-specific.
