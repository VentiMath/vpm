# vfirebase-functions

**Implementation status:** independently implemented for VentiMath's application
surface: HTTP and callable handlers, logging, parameters and secrets, schedules,
task queues, Firestore triggers and deployment discovery. No hand-written
upstream provider runtime remains in this package. The attributed upstream
declarations and generated Firestore protobuf codec remain; Admin/Firestore
clients are separately tracked VPM dependencies.

The Cloud Functions for Firebase SDK, targeting **firebase-functions 7.4.0**, the
latest stable release checked November 2, 2026. Dependencies are VPM packages
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

The root and `v2` export the supported second-generation API. Direct entrypoints
are `logger`, `logger/compat`, `params`, `core`, `options`, `https`, `firestore`,
`scheduler` and `tasks` (the last six also have `v2/` aliases). The Firebase CLI
`firebase-functions` bin remains. CommonJS, native ES modules and TypeScript are
supported. V1 providers, Realtime Database triggers, Pub/Sub, Storage triggers,
Eventarc, identity, alerts, Remote Config, Test Lab, AI, lifecycle hooks and Data
Connect are outside this package's scope and are not exported. Their copied
implementations and the optional GraphQL peers were removed. This does not
remove the separately implemented Cloud Storage or Admin clients.

Built, not yet released or adopted by VentiMath.

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
  public arrays and removes every duplicate name. Generic parameter expressions are independently implemented. Frozen validation
  options remain untouched, CEL string literals are escaped, interpolation tokens
  cannot collide with literal text, and all ordered List comparisons are rejected.
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
- **Independent task queues.** Invocation, task headers, error envelopes and queue
  definitions use the same shared lifecycle/definition building blocks. The
  Discord deadline's IAM invoker, retry policy and concurrency limit match 7.4.0.
  Production task authentication belongs to the Cloud Run/Functions IAM boundary;
  this adapter decodes the platform token to expose claims and does not verify
  JWT signatures itself. Do not expose task handlers as unauthenticated routes.
- **Shared helpers.** Own-property option copying preserves prototype-named data.
  Malformed or null debug records disable features; inherited names cannot turn
  them on. Reset sentinels, role registration and optional console routing have
  independent implementations with shared CJS/ESM identity.
- **Declarations** compile without ambient Node types and use VPM's Express
  and CORS declarations.

## Evidence

- [Upstream suite](../../scripts/firebase-functions-conformance/README.md): an
  explicit 351-test application selection from the pinned release runs unchanged
  against both implementations. Four VPM assertions retain the exact span-ID
  correction; Bun's console-capture differences are checked against the original.
  This is not a claim that all 996 SDK tests apply after removing unused providers.
- [Callers](../../scripts/firebase-functions-conformance/callers.cjs): VentiMath's
  function shapes including its task-queue deadline configuration, served by one shared host (HTTP with and without CORS,
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
  [completion regressions](test/completion.test.cjs), and [type tests](test/types.ts).
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

Trace parsing, event materialization and invocation results differ by runtime
and case; the report records which directions hold beyond the control variation.
Input preservation and discovery validation add deployment costs, and several
callable paths cost more. The complete report retains all nineteen cases,
including regressions, outliers and identical-code controls. These local CPU
measurements do not imply a general speedup or application latency guarantee.

Current measurements retain these costs: task declaration takes 20% more time
on Node / 42.6% on Bun; the initialized local task adapter takes 27.3% / 39.3%
more (1.525 → 1.946 μs / 0.992 → 1.368 μs). Non-mutating parameter specification
takes 62 → 94 ns / 120 → 238 ns. Existing regressions include Node callable
encoding and deployment discovery, and Firestore declaration on both runtimes.
Changed-document materialization improves 51.6% / 44%, and nested logging improves
34.9% / 46.7%. See the full report for controls and inconclusive cases; task
measurements use emulator-style requests and exclude platform authentication.

MIT licensing, the pinned source and the files changed from it are recorded in
[PROVENANCE.json](PROVENANCE.json).

The read-only app snapshot comparison at `7a8aad2c` found 18 existing diagnostic
locations with either implementation: missing image-rendering dependencies and
four incompatible request mocks. VPM adds no diagnostic locations; the four mock
errors name different incompatible Express fields. This is not a clean app
build claim. Incoming request declarations now match server method, URL, headers
and ordinary route parameters. Consumer migration/release and deployment are
separate work.
