# vfirebase-functions

**Implementation status:** the current package retains upstream implementation
code with the changes documented below. Logging, initialization, option
projection, manifest serialization, HTTP/callable factories and the scheduler
adapter now have independent implementations. Callable token verification,
payload encoding/streaming, Firestore providers, secret parameters and most
other SDK services still retain upstream code. Tests verify this mixed
implementation.
An independently written implementation of the application-facing APIs is
pending; this package is not yet a completed rewrite.

The Cloud Functions for Firebase SDK, targeting **firebase-functions 7.4.0**, the
latest stable release checked October 31, 2026. Dependencies are VPM packages
(`vcors`, `vexpress`, `vprotobufjs`), with `vfirebase-admin` as the peer;
Node.js 24+ and Bun.

```js
const {logger, setGlobalOptions} = require('vfirebase-functions/v2');
const {onRequest, onCall, HttpsError} = require('vfirebase-functions/v2/https');
const {onDocumentCreated} = require('vfirebase-functions/v2/firestore');

setGlobalOptions({region: 'us-central1'});
exports.api = onRequest({cors: true}, (request, response) => response.json({ok: true}));
exports.grade = onCall(request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return {correct: request.data.answer === '42'};
});
exports.roomCreated = onDocumentCreated('rooms/{roomId}', event => logger.info('room', event.params.roomId));
```

This retains 7.4.0's v1 and v2 providers (HTTPS, callable,
scheduler, task queues, Firestore, Storage, Pub/Sub, Eventarc, identity,
alerts, Remote Config, Test Lab, Data Connect), parameters and secrets, logger,
endpoint manifests, entry points and `firebase-functions` bin, which the
Firebase CLI runs to discover functions at deploy. CommonJS, native ES modules
and TypeScript are supported. The optional `@apollo/server`,
`@as-integrations/express4` and `graphql` peers are needed only for the Data
Connect GraphQL server, as upstream.

| Upstream dependency | Here |
| --- | --- |
| `cors` ^2, `express` ^5, `protobufjs` ^7 | `vcors`, `vexpress`, `vprotobufjs` |
| `@types/cors`, `@types/express` | Not needed: VPM's packages ship their declarations |
| `firebase-admin` (peer) | [`vfirebase-admin`](../vfirebase-admin/README.md) |

## Changes from 7.4.0

- **Lazy loading.** CommonJS provider and Firebase Admin imports happen on first
  use. ESM Firebase Admin services also load on first use; provider indexes
  remain static imports. Earlier timing claims used Node 22 and the previous
  benchmark harness and are not current performance evidence.
- **Independent structured logging.** Standard formatting, severity routing and
  Cloud Trace fields remain compatible. The serializer preserves null-prototype
  objects (including Express query data), shadowed property names and repeated
  sibling references. It handles cycles, throwing getters and cyclic `toJSON`
  output; BigInt becomes a precise decimal string. Nesting is capped at 256
  objects with `[MaxDepth]`. Trace enrichment does not mutate caller entries.
  Inherited properties are omitted. Unsupported severities throw `TypeError`.
- **Independent initialization.** Concurrent first invocations share one pending
  callback; a failed run can be retried. Each registration owns its completion,
  so an older callback cannot mark its replacement initialized. CommonJS and
  ESM share the same logger, trace context and initializer state.
- **Independent deployment definitions.** Shared option tables and a function
  definition builder assemble the HTTP, callable and scheduler metadata.
  Serialization returns a new wire representation, preserving reusable and
  frozen declarations, and handles deeply nested declarations iteratively.
  HTTP CORS completion removes its listener after preflight or handler completion.
  These factories and metadata helpers share CJS/ESM identity.
- **The bin's directory argument.** `firebase-functions [functionsDir]` read the
  directory only when two or more arguments were given, so a single directory
  argument was ignored and `-h` printed nothing. The Firebase CLI runs the bin
  from the functions directory without arguments, which is unchanged.
- **Realtime Database with vfirebase-admin.** Database triggers decode their
  data as before; `DataSnapshot#ref` needs the Realtime Database client, which
  vfirebase-admin omits, and throws its descriptive error. Upstream with
  vfirebase-admin would fail as soon as `firebase-functions/v2` was imported.
- **Declarations** compile without ambient Node types and use VPM's Express
  and CORS declarations.

## Evidence

- [Upstream suite](../../scripts/firebase-functions-conformance/README.md): the
  release's 996 unit tests pass for the original on Node, and for VPM except
  `DataSnapshot#ref`, which must fail with vfirebase-admin's explanation.
- [Callers](../../scripts/firebase-functions-conformance/callers.cjs): VentiMath's
  function shapes served by one shared host (HTTP with and without CORS,
  handler errors, callable with and without auth and with the wrong method,
  scheduler, task queue) and a protobuf Firestore trigger event produce
  identical responses, handler results and endpoint definitions. The one
  intentional logging difference preserves Express query data that upstream
  replaces with a serialization-error placeholder.
  The bin writes an identical deploy manifest.
- [Regressions](../../scripts/firebase-functions-conformance/regressions.cjs):
  each change above reproduced with the original, then checked here.
- [Package tests](test/firebase-functions.test.cjs), [logging and initialization
  regressions](test/logging-init.test.cjs), [deployment regressions](test/deployment.test.cjs),
  and [type tests](test/types.ts).
- [Measurements](bench/results/README.md): isolated logging, initialization,
  endpoint construction, fresh manifest serialization and initialized HTTP
  invocation comparisons on Node 24 and Bun. Console and network I/O are excluded.

The measurements distinguish function-definition and deployment costs from
per-request execution. Manifest serialization now copies its input to preserve
frozen/reusable declarations; the benchmark includes construction of a fresh
64-endpoint input for both libraries. The report retains every sample and the
identical-code controls, including inconclusive results.

In this run, HTTP endpoint construction is 16.1% faster on Node and 19.7%
slower on Bun (about 80 ns extra). Serializing 64 fresh endpoints costs 11.8%
more on Node and 56.9% more on Bun, about 6 and 22 microseconds respectively,
in return for preserving the input. Both initialized HTTP-invocation
comparisons are inconclusive. These deployment-time costs do not recur per
request. Nested logging remains faster; the initialized callback itself still
has a roughly 6 ns Node cost for its stronger registration semantics.

MIT licensing, the pinned source and the files changed from it are recorded in
[PROVENANCE.json](PROVENANCE.json).
