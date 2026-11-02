# Protobuf comparison fixtures

The public runtime comparison target is **protobuf.js 8.8.1**, checked November 2,
2026, at [798b4c9](https://github.com/protobufjs/protobuf.js/tree/798b4c942cca81a7ae0a2694f28ecd2985d386c9).
The lockfile pins proto-loader 0.8.1, google-gax 6.14.0, Firestore 9.4.0 and the
separate protobufjs-cli 2.7.1. Google callers' original protobuf runtime is 7.6.6.
These are comparison fixtures, not VPM runtime dependencies.

```sh
npm --prefix scripts/protobuf-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/protobuf-conformance/application.cjs
node scripts/protobuf-conformance/binary.cjs
node scripts/protobuf-conformance/binary.cjs --upstream
node scripts/protobuf-conformance/firestore.cjs
node scripts/protobuf-conformance/regressions.cjs
node scripts/protobuf-conformance/callers.cjs
node scripts/protobuf-conformance/callers.cjs --upstream
node scripts/protobuf-conformance/callers.cjs --legacy
node scripts/protobuf-conformance/bundles.cjs
node scripts/protobuf-conformance/run.cjs --compat
node scripts/protobuf-conformance/run.cjs --upstream
```

Repeat with `bun` in place of `node`. Browser checks require Bun's bundler. The
Firestore harness opens a localhost gRPC server, with synthetic data and no cloud
credentials. CI runs both runtimes and original controls.

## Independent public runtime

`application.cjs` pairs 343 scalar, seeded and full Firestore-schema messages
against upstream: exact bytes, conversions/defaults, large integers and generated
Document messages. It asserts no retained `vprotobufjs/src/` module is imported.

`binary.cjs` verifies the retained source archive hash, then runs 15 unchanged
upstream binary/RPC test files with VPM's public runtime, plus original controls.
The CLI fixture receives the equivalent JSON schema through its own reflection
constructor because it is a separate upstream compiler. Generated code executes
against VPM. Test assertions are unchanged; the streaming test's callback count
can vary with runtime scheduling, so the assertion total is not fixed.

`firestore.cjs` uses the actual Firestore SDK and GAX with only protobuf imports
replaced. The 23 workflow results and 25 decoded requests match the stock stack,
including transactions, bulk writes and Watch. The server uses stock gRPC/protobuf.
This checks the protobuf boundary, not an all-VPM SDK or a deployed cloud service.

The companion `scripts/grpc-loader-conformance/differential.cjs` compares 185
metadata/wire/conversion results across 36 options, the full Firestore schema and
four .proto fixtures. Bytes are compared losslessly as base64 so failures do not
print enormous descriptor arrays.

`consumers.cjs` evaluates installed CommonJS caller sources with per-instance
module caches. Only protobuf imports choose VPM, upstream 8 or the original 7.6.6;
installed source files are unchanged. `callers.cjs` has 22 checks including stock
controls for gRPC/fallback, descriptors, Proto3 JSON/Timestamp and generated
Firestore Value/Document serialization. The 7.6.6 descriptor map round-trip failure
is already fixed in upstream 8 and is not credited to VPM.

Seven paired correction probes check unknown groups, restored bounds, explicit
length validation, bounded skipped varints and protected zero. Focused tests add
UTF-8 validation, closed enums, prototype-safe fields/maps, message merging,
recursion limits and a CSP fallback. Performance regressions additionally cover
short Unicode and buffer-growth boundaries, writer output ownership, mixed
compiled/interpreted parity, packed destination errors and short service names.
The actual `scripts/gax-conformance/callers.cjs` fixture verifies the lookup repair
through Firestore gRPC and REST/native-fetch calls on both runtimes. `bundles.cjs` executes all three browser
entries without Node globals. Packed consumers and public declarations are
checked by the repository archive and TypeScript 7 gates.

## Retained compatibility source

[SOURCE.json](SOURCE.json) records the upstream archive commit and SHA-256.
`run.cjs --compat` explicitly selects retained `src/` code, legacy descriptors and
legacy declarations in an isolated fixture layout. Its **79 unchanged test files /
2,877 assertions** validate that compatibility source, not the new public runtime.
`--upstream` selects the original control. CLI-specific tests and old prebuilt UMD
loader tests are excluded; neither CLI nor those bundles are shipped by VPM.

## Measurements

`packages/vprotobufjs/bench/application.cjs` runs each implementation in a separate
process with balanced AB/BA order, fixed paired iteration counts, four process
pairs and two identical-source controls. Outputs are checked outside timing.
[Reports](../../packages/vprotobufjs/bench/application-results/README.md) retain
source hashes and all samples, including regressions and inconclusive controls.
