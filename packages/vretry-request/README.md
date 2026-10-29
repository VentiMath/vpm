# vretry-request

Callback and readable-stream retry policy targeting `retry-request` **9.1.0**,
with zero runtime dependencies. Supports Node.js 22+ and Bun; performance work
targets Node 24 and Bun. The caller supplies the transport.

```js
const retry = require('vretry-request');

const operation = retry('https://example.com/data', {
  request: myRequestTransport,
  retries: 2,
  noResponseRetries: 2,
}, (error, response, body) => {
  // Handle the final result.
});

// Cancels an active transport and any scheduled retry.
operation.abort();
```

The transport receives `(requestOptions, callback)` in callback mode. Without a
callback, it must return a Node-compatible readable stream that emits `response`
before its accepted body ends. The returned readable supports `abort()`,
`destroy()`, `pipe()`, async iteration, and `request`, `response`, `complete` and
`error` events. `objectMode: true` supports gRPC-style object streams. A string
request becomes `{url: string}`; object and null request arguments pass through.

## Retry policy

The default response policy retries HTTP 100–199, 429 and 500–599. Defaults are
two response retries and two independent transport-error retries. A response's
body is withheld until the attempt is accepted; failed bodies are discarded.
Errors after accepting a response terminate the stream without replaying bytes.

`shouldRetryFn(response)` customizes the response policy. `maxRetryDelay` (64),
`retryDelayMultiplier` (2) and `totalTimeout` (600) use upstream's seconds-based
configuration, exponential backoff and 0–999ms jitter. Retry counts must be
nonnegative safe integers; timing values must be finite nonnegative numbers.
`maxRetryDelay: 0` schedules retries asynchronously without a deliberate delay.
Native timer intervals are capped and long waits are split into safe intervals.

`totalTimeout` bounds retry scheduling; the transport remains responsible for
timing out an active request or an accepted response body. When no retry budget
remains, the callback or stream receives the last response/error. An expired
initial delay without any response produces `ETIMEDOUT`. This does not add a
timer to every active request.

The exported `defaults` object remains configurable, including `defaults.request`.
An explicitly supplied `currentRetryAttempt` preserves upstream's counting
convention: it includes the first attempt, whereas the default counter excludes
it when comparing the response retry limit. A positive initial counter delays
the first attempt. `getNextRetryDelay({maxRetryDelay, retryDelayMultiplier,
retryNumber, timeOfFirstRequest, totalTimeout})` returns milliseconds and requires
an epoch-millisecond start time; expired budgets return zero.

## Intentional improvements

- Aborting or destroying the output cancels scheduled retries. Callback abort
  suppresses completion; stream abort closes the output without inventing an error.
- Each attempt accepts one decision. Duplicate callbacks, late stream responses,
  and completion events from discarded attempts cannot affect later attempts.
- Exhausted retry deadlines settle instead of leaving callers waiting forever.
  Internal elapsed time uses a monotonic clock.
- Discarded transports are detached immediately and torn down in a microtask,
  allowing their current response dispatch to finish. This prevents the
  `ERR_STREAM_UNABLE_TO_PIPE` race reproduced with teeny-request 11.1.1.
- Stream destruction releases listeners and buffering. A state-free error
  listener remains on discarded sources to absorb late cancellation errors.
- Supported options are snapshotted from own fields, reading getters once and
  ignoring `undefined`. General object merging is unnecessary. Extra option
  properties and inherited properties are not copied into the internal options
  record. Request options themselves are passed through unchanged.
- Missing stream responses and premature closure fail explicitly. Synchronous
  transport throws follow the error retry budget; predicate throws settle with
  that error. Exceptions thrown by a callback remain visible to its caller.
- Declarations distinguish callback handles from readable streams and describe
  the actual delay-helper fields without requiring `@types/request` or ambient
  Node/DOM declarations. Legacy `DEBUG=retry-request` console logging is omitted.

## Verification and performance

All 30 pinned upstream tests run on Node 24 and Bun, alongside upstream controls.
The [conformance fixture](../../scripts/retry-request-conformance/README.md)
documents its one server-cleanup portability adaptation. Thirty focused tests
cover cancellation, deadlines, stale events, retry counts, backpressure, byte and
object streams, configuration and error paths. Separate deterministic timer
checks cover large delays and clock changes. Current Cloud Storage 8.4.0
callback/download and google-gax 6.14.0 retry-request stream callers are exercised
against local servers and in-memory RPC streams; this does not assert coverage
of the complete SDKs or their independent retry engines.

See [benchmark samples and controls](bench/results/README.md) for Node 24 and Bun
measurements. Package timings do not establish an application-wide speedup.

```sh
node --test packages/vretry-request/test/*.test.cjs
bun test packages/vretry-request/test/retry.test.cjs
node scripts/retry-request-conformance/run.cjs
bun scripts/retry-request-conformance/run.cjs
node scripts/retry-request-conformance/timers.cjs
node scripts/retry-request-conformance/callers.cjs
node scripts/retry-request-conformance/callers.cjs --check-control
node packages/vretry-request/bench/compare.cjs
node packages/vretry-request/bench/summarize.cjs --verify-current
```

[Provenance](PROVENANCE.json) records the immutable upstream source and published
package integrity. Original MIT attribution is retained in [LICENSE](LICENSE).
