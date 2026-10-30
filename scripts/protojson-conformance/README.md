# Proto3 JSON comparison fixtures

The baseline is **proto3-json-serializer 4.1.0**, checked October 30, 2026, at
[703154b](https://github.com/googleapis/google-cloud-node/tree/703154ba1720ff2d1a5832ad0683a3c3bcbbadd1/core/packages/proto3-json-serializer-nodejs).
The lockfile pins that serializer, protobuf.js **7.6.6**, google-gax **6.14.0**,
Firestore **9.4.0** and Mocha. These upstream packages are test controls and callers,
not VPM runtime dependencies.

```sh
npm --prefix scripts/protojson-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/protojson-conformance/run.cjs
node scripts/protojson-conformance/run.cjs --legacy
node scripts/protojson-conformance/run.cjs --upstream
node scripts/protojson-conformance/run.cjs --upstream --legacy
node scripts/protojson-conformance/regressions.cjs
node scripts/protojson-conformance/callers.cjs
node scripts/protojson-conformance/callers.cjs --legacy
node scripts/protojson-conformance/callers.cjs --upstream
node scripts/protojson-conformance/browser.cjs
```

Repeat with `bun`. Both CI jobs run these checks; the default VPM caller check
also runs in the root integration gate. The suite compiler and browser build
use Bun, independently of the runtime executing the tests.

## Upstream suite and differences

`upstream/` retains the release's original TypeScript source, tests, schema
fixtures, metadata and license; [SHA256.json](upstream/SHA256.json) verifies them.
`compile.cjs` compiles the unchanged unit test sources with Bun. Temporary source
entry shims point their serializer imports to the selected implementation, and a
protobuf package link selects 7.6.6 or VPM's 8.8.1 runtime. No assertions are edited.
The upstream system installation test is replaced by VPM's packed-install gate.

All **316 unit cases** execute; there are no skipped cases. The harness asserts
an exact list of expected failures, so an extra difference or a vanished expected
failure fails the gate:

| Serializer | Reflected types | Original assertions passing | Verified differences |
| --- | --- | ---: | --- |
| Original 4.1.0 | protobuf 7.6.6 | 316 | None |
| VPM | protobuf 7.6.6 | 310 | Six non-finite Value output expectations |
| Original 4.1.0 | VPM protobuf 8.8.1 | 314 | Two implicit-default NullValue presence expectations |
| VPM | VPM protobuf 8.8.1 | 308 | Both groups above |

The six Value cases expect NaN/infinities to become strings, in both schema-loading
modes. VPM explicitly rejects this type-changing conversion and asserts the exact
error. The two NullValue cases differ before serialization: protobuf 8 omits an
implicit default enum that version 7 kept as an own property. Both serializers
behave alike there. Focused tests separately exercise valid Value strings/nulls
and ordinary float/double special values.

Thirteen paired correction probes use the **same protobuf 7 types** on both sides:
byte slices, repeated bytes/floats, signed duration input/output, offset timestamp
precision, invalid calendar dates, FieldMask casing, Any wrapper envelopes, own
prototype keys, malformed integers, null scalars and non-finite Value rejection.

## Actual callers

`consumers.cjs` loads real installed Google CommonJS sources with an isolated
module cache and replaces only serializer/protobuf imports. `callers.cjs` drives
actual gax fallback methods using Firestore's shipped schemas and HTTP annotations:

- GetDocument, BatchGetDocuments and CreateDocument request construction, with
  symbolic and numeric enums, compared to original request bodies and URLs.
- GetDocument response decoding with >2^53 integers, bytes, nested values and
  nanosecond timestamps.
- GoogleErrorDecoder's Status/Any details conversion.
- ResumableUploadSession's real `sendStart`, replacing only its outbound transport.
- A short-fraction offset timestamp through the real response decoder: the stock
  control returns 123 nanos instead of 123,000,000; VPM retains the correct value.

There are **twelve checks including stock controls**, with import/function counters
and unchanged source hashes. VPM runs with both protobuf 7 and 8; the original
serializer with protobuf 7 is the control. No credentials or cloud RPCs are used.
The browser check executes a built bundle without Node globals and verifies sliced
bytes and timestamp offsets. Packed installations independently verify public exports.
