# vgoogle-gax

Google API client support targeting **google-gax 6.14.0**: RPC calls, retries,
pagination, resource paths, long-running operations, tracing and REST fallback.
Runs on Node.js 24+ and Bun. All ten runtime dependencies are VPM packages;
the unused direct `node-fetch` dependency is removed.

```js
const {PathTemplate} = require('vgoogle-gax');
const document = new PathTemplate('projects/{project}/documents/{document=**}');
document.render({project: 'example', document: 'items/one'});
// projects/example/documents/items/one
```

CommonJS and ES module entry points include the root package, `fallback`, `gax`
and `build/src/protobuf`. Generated Google clients can receive the selected gax
module through their constructor. The caller fixture demonstrates this with
Firestore; it does not install VPM into an application automatically.

## Changes from 6.14.0

- Each timeout invocation gets its own options object. Concurrent calls cannot
  overwrite each other's deadlines, and frozen caller options work.
- Resource rendering preserves literal replacement metacharacters such as `$&` and `$$`,
  validates the whole binding, and fills repeated variables consistently.
  Matching enforces literal separators and prefixes; `**` consumes any positive
  number of segments, including before a suffix. Prototype-named bindings are
  own data properties. Templates compile reusable matching/rendering structures.
- REST stream parsing checks commas, the final bracket and trailing data. A
  truncated response fails instead of looking like a successful short result.
  Fragmented messages retain slices and assemble once, avoiding repeated copies.
  UTF-8 sequences and escaped strings can span chunks. Completed messages remain
  incremental: a later error does not retract messages already delivered.
- Ordinary REST calls use native fetch through `vgoogle-auth-library` and
  `vgaxios`. The legacy forced keepalive agent is removed. Node-agent, proxy and
  client-certificate handling remains the auth transport's responsibility.
  Response bodies are consumed through gaxios's selected stream, avoiding a
  second read of an already locked fetch body; pipeline failures emit once.
- gRPC streaming explicitly permits terminal status after readable end in
  `vretry-request`, while retaining ordinary HTTP premature-end checks. Protobuf
  8 message metadata identifies `Any` values without generated constructor names;
  empty nested `Any` error payloads preserve gax's public shape.

## Compatibility and limits

The target is the latest stable release checked October 30, 2026. This includes
the existing generated clients for locations, IAM and operations, and the
upstream retry, pagination, streaming, transcoding and tracing APIs. Public
declarations compile without ambient Node, Undici or DOM types.

Malformed ProtoJSON fields are rejected by `vproto3-json-serializer`; a string
where a message object is required no longer silently becomes an empty message.
Invalid resource bindings and conflicting repeated values throw `TypeError`.
Treat a constructed path template as fixed; mutating its public inspection
fields does not rebuild its compiled structures. Older gax major versions,
browser bundles, authenticated cloud system tests and deployments are outside
the verified scope.

## Evidence

- [Upstream conformance](../../scripts/gax-conformance/README.md): 751 active
  tests on Node 24 and Bun, four original skips, and one explicit strict-ProtoJSON
  expectation change. Original source and hashes are retained.
- [Focused tests](test/gax.test.cjs) and
  [upstream bug controls](../../scripts/gax-conformance/regressions.cjs) cover the
  timeout, path, malformed-stream and cancellation fixes.
- [Actual callers](../../scripts/gax-conformance/callers.cjs) exercise Firestore
  9.4.0 unary/server-stream/bidirectional RPCs, `getAll`, batch commits,
  read/write transactions and streamed queries against local servers. REST tests
  use the real auth/fetch stack and verify successful, failed and truncated
  responses. Both runtimes run original-package controls.
- [Benchmarks](bench/results/README.md) retain paired samples, controls and source
  hashes. They measure both helpers and actual Firestore SDK requests.

Recorded repeated path operations take 46–87% less time, and the fragmented
64 KiB JSON case takes 71% less on Node and 75% less on Bun. Node bare template
construction costs an extra 0.16 µs; first render offsets that setup cost. Local
Firestore RPC timings are approximately level, with a noisy +5.9% Bun unary
result explicitly retained in the report.

Apache-2.0 upstream provenance is recorded in [PROVENANCE.json](PROVENANCE.json).
