# vgoogle-gax

Independent Google API client support for VentiMath's Firestore workflows,
matching **google-gax 6.14.0**. Runs on Node.js 24+ and Bun. The public application
runtime implements calls, retries, paging, streams, resource paths, metadata,
credentials, tracing and REST fallback. All nine runtime dependencies are VPM
packages.

```js
const {PathTemplate} = require('vgoogle-gax');
const document = new PathTemplate('projects/{project}/documents/{document=**}');
document.render({project: 'example', document: 'items/one'});
// projects/example/documents/items/one
```

The root, `fallback` and `gax` exports use the independent implementation in
`app-runtime/`, with CommonJS, ES modules and self-contained declarations.
Generated Google clients can receive the selected GAX module in their
constructor. This package is built and verified; this change does not install it
into VentiMath or publish a release.

## Implementation boundary

The application-facing rewrite is complete for the documented Firestore scope.
It covers unary, server-streaming and bidirectional gRPC; REST requests and
server streams; callbacks/promises, deadlines, cancellation, retries, paging,
locations and OpenTelemetry logical-call/attempt spans.

`build/src/` still retains attributed upstream compatibility code for IAM,
administration and long-running operations, file-based proto loading, bundling,
resumable uploads and private upstream test contracts. Public administration/LRO
adapters load that code lazily. Protocol schemas, generated namespace data and
some compatibility declaration types also retain upstream provenance. Ordinary
Firestore imports load none of that GAX runtime except the independently written
JSON descriptor cache shared by both implementations. This is **not** a claim
that every unused GAX API has been independently rewritten.

Browser execution, REST client/bidirectional streaming, automatic mTLS certificate
discovery and unused upstream customization hooks are outside the independent
contract. Explicit certificates/keys and `sslCreds` are supported. Tracing covers
the tested logical-call/attempt lifecycle, not every upstream diagnostic hook.
Cloud credentials and production deployments are outside these local gates.
The upstream version was checked November 2, 2026.

## Behavior and correctness

- Call settings snapshot retry, metadata and transport options. Per-call timeout
  overrides do not mutate shared or frozen defaults. Explicit retry overrides
  retain upstream precedence.
- Callback-style calls return `undefined`, as upstream does; generated Firestore
  wrappers can safely use optional promise chaining. Promise-style calls retain
  their cancellation method. Success and error callback returns have paired
  upstream controls, and the existing VPM Firestore callback/close test remains
  unchanged.
- Cancellation settles during stub initialization and retry backoff. Unresolved
  stubs time out. Late callbacks cannot settle a call twice. Paged-stream teardown
  cancels an outstanding request; caller requests remain unchanged.
- gRPC streams wait for terminal status after readable end. Server-stream retries
  cannot silently replay already delivered data; resumption requires an explicit
  resumption hook. Throwing retry hooks reject the stream normally.
- Compiled resource templates preserve literal `$&` replacements, validate whole
  bindings and repeated names, and support positive-length `**` matches.
- REST uses native fetch through `vgoogle-auth-library` and `vgaxios` and consumes
  gaxios's selected response stream. It preserves HTTP status/error codes,
  normalizes abort errors without mutating read-only native exceptions, and
  enforces deadlines while reading a response body. Cancelling the fallback
  transport's stream closes it quietly, matching upstream.
- Streamed JSON validates commas, closing brackets, trailing data and ProtoJSON
  fields. UTF-8 and escaped strings may span chunks. Completed objects are
  delivered immediately; a later framing error cannot retract earlier messages.
- The independent descriptor cache compiles one serialized JSON snapshot and
  scopes gRPC results by compiler. Equal content shares results, refresh replaces
  entries, clear releases them and failed compilations are not cached. Native
  SHA-256 keys replace the general `object-hash` dependency.

JSON descriptors must be JSON data. Serialization hooks run once per cache call;
property insertion order remains part of identity. Compiled results are shared
and must not be mutated. Path templates should be treated as fixed after
construction. Invalid resource bindings and malformed ProtoJSON are deliberate
rejections, rather than upstream's permissive results.

## Verification

[Independent application tests](../../scripts/gax-conformance/application.test.cjs)
cover 17 groups, including frozen-default upstream controls, cancellation,
backpressure, retry failures, framing at every byte split and path validation.
[Actual stock Firestore callers](../../scripts/gax-conformance/firestore.cjs)
match 23 results and 25 decoded requests against original packages, including
transactions, bulk writes, queries and Watch disconnect/resume tokens. The
[caller gate](../../scripts/gax-conformance/callers.cjs) also checks native REST
and current OpenTelemetry SDK integration.

[Paired HTTP tests](../../scripts/gax-conformance/rest-application.cjs) cover
UTF-8, 204 responses, JSON/HTML errors, deadlines after headers, cancellation and
incremental stream delivery. The generated Firestore API gate passes all 320
upstream tests, plus a wire comparison across 24 RPCs; its administration cases
also exercise the retained compatibility surface.

[Clean archive checks](../../scripts/gax-conformance/archives.cjs) install the
24-package VPM closure through npm and Bun, then check CJS/ESM entry identity,
independent-runtime loading and TypeScript 7 NodeNext/Bundler declarations without
ambient Node/Undici/DOM types. Node 24 and Bun run the application gates. The
[751-test upstream gate](../../scripts/gax-conformance/README.md) separately
validates the retained `build/src` compatibility surface, with four upstream
skips; it is not presented as coverage of every new implementation path.

[Current benchmarks](bench/application-results/README.md) compare isolated,
balanced processes with identical-upstream noise controls. They measure settings,
paths, descriptor hits and actual local Firestore SDK calls. They include the
selected dependency stacks and are not production latency guarantees. The current callback-return correction is a compatibility repair; these timings
record the preceding implementation and do not measure that correction. Earlier
[helper/cache](bench/results/README.md) and
[initialization](bench/initialization-results/README.md) reports describe their
recorded earlier sources, not this application rewrite.

The final settings merge takes 132 ns versus 42 ns upstream on Node, and 153 ns
versus 70 ns on Bun: about 90 / 83 ns extra for owned retry/option snapshots.
Redundant copies were removed before this recording; the remaining difference
is established in every pair. All other directions remain inconclusive against
the recorded controls, including local network calls. No overall speedup is
claimed from this run.

Apache-2.0 attribution and the exact boundary are recorded in
[PROVENANCE.json](PROVENANCE.json).
