# vopentelemetry-api

OpenTelemetry's API and no-op implementations, based on **@opentelemetry/api
1.10.0**, with isolated baggage entries and validated, cached trace state.
Zero runtime dependencies. Node 24, Bun and native browser ESM.

```js
import { context, propagation, trace } from 'vopentelemetry-api';

const baggage = propagation.createBaggage({ request: { value: 'example' } });
const current = propagation.setBaggage(context.active(), baggage);
context.with(current, () => {
  const span = trace.getTracer('my-service').startSpan('operation');
  try { /* application work */ } finally { span.end(); }
});
```

An installed context manager and tracing SDK provide async propagation and
recording. Without registered providers, the API stays a no-op. This package does
not send telemetry, install an SDK or change an application's configuration.

## Changes from 1.10.0

- Baggage construction, updates and enumeration copy entry records. Mutating an
  input record or an enumerated record cannot change an existing baggage object
  or another context derived from it. Opaque metadata retains its identity.
- Trace-state updates validate string keys and values against the existing
  grammar, including length limits. Invalid updates leave the original state
  unchanged instead of producing invalid outgoing trace-state values.
- Parsing more than 32 valid entries retains the first 32 in their original wire
  order; upstream reverses their serialized order in this case.
- Immutable trace-state objects cache serialization and track serialized length,
  avoiding repeated reconstruction when checking updates or sending headers.
- Archives retain CJS, native ESM and their declarations, with source maps omitted.

These are shallow entry-record copies; metadata is deliberately not deep-cloned.
Input parsing retains upstream's valid-subset behavior and 512-character limit.
Private implementation fields are not a supported mutation interface.

## Compatibility

The root API, including tracing, context, propagation, diagnostics, metrics and
logs, and the `vopentelemetry-api/experimental` entry are retained. The experimental
entry has upstream's experimental stability contract. CommonJS is also supported.

The shared global symbol and **API compatibility version 1.10.0** remain upstream's.
They are separate from this package's distribution version 0.1.0. Providers
registered through upstream or VPM are visible to the other implementation,
including native ESM. Duplicate registration and incompatible-version rules are
preserved. A 1.9 reader can use a 1.10 registry; a registry first created by 1.9
still cannot register 1.10 APIs. Initialize the current API before older copies.

## Verification and measurements

The [fixture](../../scripts/otel-conformance/README.md) runs 1,151 unchanged upstream
common test assertions on Node 24 and Bun, nine focused regression tests and
11,000 valid-input comparisons. Actual SDK 3.0.0/context manager 3.0.0 and Google
gax 6.14.0 verify concurrent async contexts, shared providers, parent spans,
promise failures, callbacks, streams and HTTP attempt attributes. Browser-targeted
bundles execute in a VM without Node globals; this is not a browser-engine matrix.
Public declarations and isolated CJS/ESM archives are checked separately.

See [paired benchmarks](bench/results/README.md) for timings, regressions, controls
and reproduction commands. Those microbenchmarks do not establish an improvement
in end-to-end cloud request latency. Real cloud exports and the full SDK's own
suite are outside this package's verification scope.

Apache-2.0; original authorship, version and source hashes are recorded in
[PROVENANCE.json](PROVENANCE.json).
