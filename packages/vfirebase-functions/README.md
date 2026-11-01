# vfirebase-functions

**Implementation status:** the current package retains upstream implementation
code with the changes documented below. Logging, initialization, option
projection, manifest serialization, HTTP/callable factories and the scheduler
adapter now have independent implementations. Callable request validation,
verification orchestration, payload conversion and response streaming are also
independently implemented. Firestore trigger adapters and secret accessors now
use independent implementations as well. The underlying Admin/Firestore clients,
generic parameter expressions, deployment discovery and other SDK services
still retain upstream code. Tests verify this mixed
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
- **Independent callable transport.** Request validation, authentication
  orchestration and response lifecycle are separate from deployment definitions.
  Production tokens still go through the Admin SDK; the existing explicit debug
  feature controls emulator-only decoding. Authorization policies, App Check
  enforcement and consumption, error envelopes and streaming remain compatible.
  Payload conversion preserves own `__proto__` keys, ignores inherited type
  markers, detects cycles, and switches from bounded recursion to an explicit
  worklist for deep data. Error codes must be canonical own names. Synchronous
  stream callbacks work, pending chunks resolve `false` on disconnect, and
  heartbeat/response listeners are cleaned up. Calls to `sendChunk` after
  completion return `false`. Upstream source and tests informed this redesign;
  it is not a clean-room implementation.
- **Independent Firestore triggers and secrets.** A shared snapshot materializer
  decodes changed protobuf events once for both documents; generated protocol
  schemas and Admin/Firestore snapshot classes remain dependencies. Static
  document patterns are prepared at declaration time, and prototype-named
  captures remain own data. Nested field-mask changes accumulate across siblings
  without changing inputs. Timestamp projection preserves fractional nanoseconds
  with offsets and before the epoch, and rejects invalid timestamps. Secret
  reads stay dynamic and unavailable during deployment; JSON errors omit parser
  excerpts that could quote a credential. Parameter registration preserves its
  public arrays and removes every duplicate name. Generic expression classes
  remain upstream-derived.
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
  import loading, concurrent initialization and the bin argument are reproduced
  with the original, then checked here; additional fixes have focused tests below.
- [Package tests](test/firebase-functions.test.cjs), [logging and initialization
  regressions](test/logging-init.test.cjs), [deployment regressions](test/deployment.test.cjs),
  [callable regressions](test/callable.test.cjs), [event and secret regressions](test/events-secrets.test.cjs),
  and [type tests](test/types.ts).
- [Measurements](bench/results/README.md): isolated logging, initialization,
  endpoint construction, fresh manifest serialization and initialized HTTP
  invocation, callable payload conversion, callable requests, secret reads and
  Firestore event materialization on
  Node 24 and Bun. Console and network I/O are excluded. The callable request
  case has no token headers and therefore does not measure cryptographic
  verification or the Admin SDK.

The measurements distinguish function-definition and deployment costs from
per-request execution. Manifest serialization now copies its input to preserve
frozen/reusable declarations; the benchmark includes construction of a fresh
64-endpoint input for both libraries. The report retains every sample and the
identical-code controls, including inconclusive results.

The event recording shows 45.1% lower time for changed protobuf documents on
Node (3,295 to 1,810 ns). Bun's event result is inconclusive because process
pairs reverse direction. Firestore trigger construction is inconclusive on Node
and takes 51.2% more time on Bun (564 to 871 ns); it prepares the document pattern
once for subsequent invocations. Secret reads are inconclusive on both runtimes.

The same recording retains the callable costs: Node structured encoding and
decoding take 46.5% and 16.3% more time. The request without token headers takes
15.3% more time on Node and 18.6% more on Bun. Bun decoding takes 33.1% less time.
These are local CPU measurements, not a general speedup or an application latency
claim. The complete report includes every case and its controls.

MIT licensing, the pinned source and the files changed from it are recorded in
[PROVENANCE.json](PROVENANCE.json).
