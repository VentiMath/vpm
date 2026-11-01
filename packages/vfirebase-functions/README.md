# vfirebase-functions

**Implementation status:** the current package retains upstream implementation
code with the changes documented below. Logging, initialization, option
projection, manifest serialization, HTTP/callable factories and the scheduler
adapter now have independent implementations. Callable request validation,
verification orchestration, payload conversion and response streaming are also
independently implemented. Firestore trigger adapters and secret accessors now
use independent implementations as well. The underlying Admin/Firestore clients,
generic parameter expressions and other SDK services still retain upstream code.
Trace propagation, configuration, app selection and deployment discovery also
have independent implementations. Tests verify this mixed
implementation.
The application-facing functions described here have independent runtime
implementations; the package as a whole remains a mixed implementation, including
retained providers outside VentiMath's current use.

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
- **Independent runtime and discovery.** An explicit worklist discovers grouped
  exports without recursive stack growth. Ancestor cycles and colliding endpoint
  names are rejected; shared groups and prototype-named exports remain valid.
  Manifest-file output and the small native HTTP discovery server avoid loading
  Express. Configuration accepts leading JSON whitespace and works without
  `PWD`. Selecting the same internal Admin app does not delete it, and unexpected
  registry errors propagate. Runtime and discovery helpers share CJS/ESM identity.
- **Exact trace context.** Decimal Google span IDs use integer conversion rather
  than floating-point rounding. W3C `traceparent` identifiers and versions are
  validated, sampling uses the low bit, and header names are case insensitive.
  A valid `traceparent` takes precedence over the legacy Google header, following
  [Google's guidance](https://docs.cloud.google.com/trace/docs/trace-context).
  Request context stays isolated across async handlers, which retain their receiver.
  [W3C Trace Context](https://www.w3.org/TR/trace-context/) defines the wire format.
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
  release's 996 unit tests pass for the original on Node. VPM passes 991;
  four original assertions expect rounded span IDs and are checked for only the
  exact integer correction. `DataSnapshot#ref` must fail with vfirebase-admin's
  explanation. Bun has the same additional 25 console-capture failures as upstream.
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
  [runtime and discovery regressions](test/runtime.test.cjs),
  and [type tests](test/types.ts).
- [Measurements](bench/results/README.md): isolated logging, initialization,
  endpoint construction, fresh manifest serialization and initialized HTTP
  invocation, callable payload conversion, callable requests, secret reads and
  Firestore event materialization, trace parsing and deployment discovery on
  Node 24 and Bun. Console and network I/O are excluded. The callable request
  case has no token headers and therefore does not measure cryptographic
  verification or the Admin SDK.

The measurements distinguish function-definition and deployment costs from
per-request execution. Manifest serialization now copies its input to preserve
frozen/reusable declarations; the benchmark includes construction of a fresh
64-endpoint input for both libraries. The report retains every sample and the
identical-code controls, including inconclusive results.

The current recording establishes lower Node trace-parsing time: 20.4% for
`traceparent` and 13.6% for the legacy Google header. Bun trace results are
inconclusive. Discovery of 64 grouped endpoints takes 93.5% more time on Node
(12,072 to 23,283 ns); Bun discovery is inconclusive. This is deployment work,
with explicit cycle and collision checks, rather than request processing.

Changed protobuf-event materialization takes 36.9% less time on Bun; the Node
result is inconclusive because one pair reverses direction. Trigger construction
still costs more on both runtimes. Callable conversion and request costs remain
mixed; the complete report retains all sixteen cases, including regressions,
outliers and identical-code controls. These local CPU measurements do not imply
a general speedup or application latency guarantee.

MIT licensing, the pinned source and the files changed from it are recorded in
[PROVENANCE.json](PROVENANCE.json).
