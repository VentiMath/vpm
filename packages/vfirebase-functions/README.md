# vfirebase-functions

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

This is 7.4.0's implementation: the same v1 and v2 providers (HTTPS, callable,
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

- **Cold start.** Upstream's v1 and v2 indexes require every provider at
  import, and the providers require Firestore, Auth, App Check and the Realtime
  Database client. Importing `firebase-functions/v2` for its `logger` loaded 663
  modules in about 480 ms on Node 22, including the Firestore client, a gax
  stack and the Realtime Database client; `v2/https` loaded 241. Here providers
  and Firebase Admin services load on first use: the logger import is about 16
  ms, and a codebase with HTTP, callable, scheduled, task-queue and Firestore
  functions loads 57 modules in about 42 ms. Every new instance pays this before
  serving its first request. The ES module build loads Firebase Admin services
  on first use too; its provider indexes stay static imports.
- **`onInit` runs once.** Upstream sets its done flag only after the callback
  finishes, so each invocation that arrives meanwhile (a new instance takes up
  to 80 concurrently) runs the callback again. Concurrent first invocations
  share one run here; a failed run is retried by the next invocation.
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
  identical responses, log entries, handler results and endpoint definitions.
  The bin writes an identical deploy manifest.
- [Regressions](../../scripts/firebase-functions-conformance/regressions.cjs):
  each change above reproduced with the original, then checked here.
- [Focused tests](test/firebase-functions.test.cjs) and [type tests](test/types.ts).
- [Measurements](bench/results/README.md): cold start and per-event CPU.

MIT licensing, the pinned source and the files changed from it are recorded in
[PROVENANCE.json](PROVENANCE.json).
