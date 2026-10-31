# OpenTelemetry API verification

Pinned **@opentelemetry/api 1.10.0**, source commit
`12a5817ad147c186a0e45a6637abd5abf423727a`, compared with
[vopentelemetry-api](../../packages/vopentelemetry-api). The fixture also installs
SDK tracing 3.0.0, async-hooks context manager 3.0.0 and an explicit API 1.9.0 copy
for registry interoperability. These packages are verification tools, outside
VPM's runtime dependencies. The current SDK is `@opentelemetry/sdk-trace`, replacing
the deprecated `sdk-trace-base` package.

```sh
npm --prefix scripts/otel-conformance ci --ignore-scripts --no-audit --no-fund
npm --prefix scripts/protobuf-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/otel-conformance/run.cjs --upstream
node scripts/otel-conformance/run.cjs
node scripts/otel-conformance/regressions.cjs
node scripts/otel-conformance/callers.cjs --upstream
node scripts/otel-conformance/callers.cjs
node scripts/otel-conformance/browser.cjs
```

Repeat the commands using `bun` for the second runtime. CI runs both upstream
controls; VPM callers also run inside the repository integration gate.

## Upstream test harness

`upstream/` preserves the 24 common test files, supporting files, package manifest,
Apache license and SHA-256 hashes from the exact source commit. `.ts.txt` keeps
Bun's root discovery from treating fixtures as package tests. The runner restores
names and compiles with the workspace TypeScript 7 compiler. It adapts 30 namespace
imports to CommonJS import assignments for callable assert/Sinon behavior and
bridges source imports to the selected published CJS files. Test assertions are
unchanged. The source-only no-op diagnostic logger helper, omitted from the
published runtime by tree shaking, is compiled from its pinned source.

The version assertion uses upstream's manifest because it tests the API registry's
1.10.0 protocol, not VPM's distribution version. Cache-clearing tests still reload
the selected implementation. The runner requires exactly **1,151 passes, zero
failures and zero skips** on both Node 24 and Bun, for upstream and VPM.
Upstream browser infrastructure, packaging/tree-shaking checks, performance suites
and obsolete Node compatibility harnesses are not included in that count.

## Additional coverage

- Nine focused package tests isolate baggage mutation, own `__proto__` data,
  trace-state grammar, length accounting, order, immutability and native ESM.
- `regressions.cjs` compares 10,000 deterministic valid trace-state operations and
  1,000 baggage operations exactly. Original controls reproduce all four defects:
  retained input mutation, exposed enumeration records, invalid updates and
  reversed overflow serialization.
- `callers.cjs` uses the real tracing SDK and AsyncLocalStorage context manager.
  CJS upstream, CJS VPM and native ESM each register providers, then all three plus
  API 1.9 read them. Concurrent async context/baggage, duplicate registrations and
  incompatible registries are asserted. Small metrics/logs provider fixtures
  additionally check registry identity; they are not a full metrics/logs SDK test.
- The real Google gax 6.14.0 tracing helpers come from the protobuf fixture via a
  private loader substituting only their API import. Checks cover span recording,
  parenting, success/error promises, callbacks, single stream completion and HTTP
  method/template attributes. They exercise tracing orchestration without making
  cloud requests. The gRPC fixture separately covers Firestore transport.
- `browser.cjs` builds both native ESM entries for browsers and executes them in a
  VM without Node globals. It checks context, baggage, trace state and no-op
  tracing/metrics/logs. This is a bundle smoke check, not browser-engine coverage.

The upstream suite alone did not detect the baggage/trace-state defects; the
focused tests and original controls make those improvements independently visible.
Benchmark inputs, raw rounds and controls live in the
[package benchmark record](../../packages/vopentelemetry-api/bench/results/README.md).
