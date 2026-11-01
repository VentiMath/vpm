# vfirebase-functions

**Implementation status:** the current package retains upstream implementation
code with the changes documented below. Logging and initialization are now
independent implementations; the providers and deployment machinery remain
adapted upstream code. Its tests verify this mixed implementation.
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
  regressions](test/logging-init.test.cjs), and [type tests](test/types.ts).
- [Measurements](bench/results/README.md): isolated logging and initialization
  CPU comparisons on Node 24 and Bun. Console I/O is excluded.

The isolated run records nested logging about 34% lower in CPU time on Node 24
and 46% lower on Bun. Short structured requests are inconclusive. The initialized
handler costs about 11% more on Node (51 ns to 57 ns in this run); the Bun result
is inconclusive. These measurements exclude console I/O and do not predict
request latency. Provider and cold-start scripts remain available for later
remeasurement; their earlier numbers are not current claims.

MIT licensing, the pinned source and the files changed from it are recorded in
[PROVENANCE.json](PROVENANCE.json).
