# vgrpc-js

**Implementation status:** upstream-derived runtime with focused fixes. The
independent implementation of the caller paths VentiMath needs is still pending.
[Provenance](PROVENANCE.json) identifies the retained code and rewrite scope.

A gRPC HTTP/2 client and server derived from **@grpc/grpc-js 1.14.7**, for Node.js
24 and Bun. It uses `vgrpc-proto-loader`; its entire external
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
- Fragmented input is copied into owned geometric storage as it arrives. Caller
  mutation cannot alter a pending message. One-byte fragmentation no longer
  retains one Buffer view per fragment. Header-only messages do not reserve
  their advertised payload; oversized-header errors are terminal.
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
[Fresh-process decoder benchmarks](bench/decoder-results/README.md) cover the
independent framing implementation. The earlier [transport recordings](bench/results/README.md)
are historical same-process evidence, not current application speedup claims.

## Independent Channelz registry

Channelz now owns a small, independently written AVL tree for numeric IDs. It no
longer loads `vordered-map`. Lookup, insertion and removal take O(log n); a page
starts with a tree search and visits only its requested rows. The implementation
has no general comparator, rank index or mutable tree-iterator proxies. The
[registry benchmarks](bench/channelz-results/README.md) include stable pages,
connection updates, repeated middle-ID churn and pages immediately after changes.
Node's two paging cases take about 79–81% less time, and the 100-channel Bun case
about 69% less. Child reference/release takes 88% / 84% less time on Node / Bun.
One stress case remains slower: repeatedly removing and restoring the middle ID
among 10,000 children takes 138 → 279 ns on Bun. These are diagnostic costs, not
HTTP/2 payload or application throughput gains; inconclusive cases remain in the
report alongside the improvements and regression.

The registry covers the operations this caller uses, not the general OrderedMap
API. Internal child lists retain ordered pair iteration, `forEach`, `size()` and
`getElementByKey`; general comparator, rank and mutable tree-iterator APIs are no
longer exposed there. Iteration returns detached pairs, and deleting the current
ID in a callback does not skip its successor. The underlying entry objects remain
shared for reference counting. The Channelz service's request/response shapes,
ordering, pagination defaults, reference counts and disabled-registration behavior
remain compatible for valid requests. Direct handler calls with IDs that parse
to NaN now return NOT_FOUND. Internal registrations require nonnegative
safe-integer IDs before mutating the registry. The original tree comparator could
treat NaN as an existing key and return an unrelated entry; five paired controls
record this correction. Normal protobuf-decoded numeric IDs are unaffected. The
transport and remaining diagnostics runtime are still upstream-derived.

The seven-handler differential fixture, nine upstream Channelz network tests,
randomized registry checks and packed consumers run on Node 24 and Bun. See
[fixture details](../../scripts/grpc-conformance/README.md).

## Independent frame decoder

The decoder now retains a five-byte header and at most one geometrically growing
payload allocation. A 64 KiB message arriving one byte at a time needs at most ten
payload allocations in total, not roughly 65,000 retained fragment views. Allocated
capacity never exceeds the declared frame; the receive limit is checked after the
fifth header byte, before buffering payload. Unlimited mode does not preallocate a
multi-gigabyte frame just because a peer advertises one.

The gRPC compression flag, zero-length messages, concatenated frames and all
header splits retain their framing contract. Compression and incomplete-stream
termination remain the responsibility of the surrounding transport. This replaces
the decoder, not the HTTP/2 client/server orchestration. No application deployment
or complete independent gRPC implementation is claimed.
