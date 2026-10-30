# Protobuf comparison fixtures

The runtime baseline is **protobuf.js 8.8.1**, checked October 30, 2026, at
[798b4c9](https://github.com/protobufjs/protobuf.js/tree/798b4c942cca81a7ae0a2694f28ecd2985d386c9).
The lockfile pins proto-loader **0.8.1**, google-gax **6.14.0**, Firestore **9.4.0**,
the separate protobufjs-cli **2.7.1**, tape and reflect-metadata. Google callers
resolve protobuf.js **7.6.6**; the actual installed caller sources are used.
These are comparison fixtures, not VPM runtime dependencies.

```sh
npm --prefix scripts/protobuf-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/protobuf-conformance/run.cjs
node scripts/protobuf-conformance/run.cjs --upstream
node scripts/protobuf-conformance/regressions.cjs
node scripts/protobuf-conformance/callers.cjs
node scripts/protobuf-conformance/callers.cjs --upstream
node scripts/protobuf-conformance/callers.cjs --legacy
node scripts/protobuf-conformance/bundles.cjs
```

Repeat with `bun` in place of `node`. The browser check requires Bun's bundler.
CI runs both runtimes and upstream controls. VPM caller checks also run inside
the root integration gate, which aliases the 8.8.1 fixture and verifies shared
constructors across its public runtime and descriptor entries. It does not apply
a blanket alias to every version 7 consumer.

## Retained upstream suite

[SOURCE.json](SOURCE.json) records the exact source commit and SHA-256 of the
retained source archive. It contains the runtime, extensions, schemas, test
sources, supporting library files and license from that commit. `run.cjs`
verifies the archive, extracts it to a temporary directory and overlays only the
selected runtime. It runs **79 unchanged runtime test files / 2,877 assertions**,
with the original installed 8.8.1 runtime as the control. No test expectations
are changed.

`cli-*.js` tests are excluded because VPM ships the runtime, not the separately
published CLI. The CLI fixture still generates code for the retained runtime
code-generation tests. `tests/node/comp_loaders.js` tests old prebuilt UMD loaders
and is excluded because those bundles are not shipped. `bundles.cjs` independently
builds and executes full/light/minimal browser bundles without Node globals,
checking exact integers, Unicode, frozen zero, reflection and parsing as applicable.

## Corrections and caller coverage

Seven paired probes demonstrate failures in stock 8.8.1 corrected by VPM: unknown
groups in empty messages, packed-reader and decoder error bounds, negative skip
lengths, fractional decode lengths, oversized skipped varints and writable zero.
Additional focused package tests cover nested/map/packed failures, accepted and
rejected integer inputs, editions, extensions and module identity.

`consumers.cjs` evaluates the actual CommonJS sources of proto-loader, gax,
proto3-json-serializer and Firestore with per-instance caches. Only protobuf
imports select the variant: VPM, upstream 8 or the callers' original 7.6.6.
Full/minimal/descriptor and Google schema imports resolve within that variant.
Installed files remain unchanged; counters confirm the selected imports, and
source hashes before/after the caller checks guard against fixture modification.

The **22 checks include stock-control paths** and cover:

- Proto-loader request serialization, gax gRPC/fallback schema loading, exact
  wire bytes, >2^53 integers, packed values, Unicode, bytes and map fields.
- Descriptor export/import through proto-loader. The legacy control explicitly
  asserts the known 7.6.6 map round-trip error; upstream 8 and VPM pass. This is
  an upstream upgrade benefit, not a VPM-specific correction.
- Actual Proto3 JSON serializer conversion, including a nanosecond Timestamp.
- Firestore's actual serializer and shipped generated Value/Document definitions:
  strings, large signed integers, Dates, bytes, nested values and document fields.

All are local serialization checks with synthetic values. There are no cloud
credentials or network RPCs, and these checks do not cover the whole SDK.
Existing pre-generated decoders are not regenerated; VPM's dynamic decoder fixes
apply to reflection/code-generation paths, while reader fixes apply to both.
